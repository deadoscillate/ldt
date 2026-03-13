import yaml from "js-yaml";
import { ZodError, type ZodIssue } from "zod";

import {
  CourseCompilationError,
  normalizeCourseDocument,
  serializeCompiledCourse,
  validateCanonicalCourse,
} from "@/lib/course/compile";
import {
  CourseTemplateResolutionError,
  CourseValidationError,
} from "@/lib/course/errors";
import {
  courseTemplateDocumentSchema,
  type CourseTemplateDocument,
  type TemplateScalarValue,
} from "@/lib/course/schema";
import {
  resolveCourseTemplate,
  type ResolvedCourseTemplate,
  type ResolveCourseTemplateOptions,
} from "@/lib/course/template";
import { collectNodeSceneWarnings } from "@/lib/course/scenes";
import type { CanonicalCourse } from "@/lib/course/types";
import type { CourseSourceDependencyGraph } from "@/lib/module-library/dependency";

export type CoursePipelineStageId =
  | "parse-source"
  | "validate-schema"
  | "resolve-templates"
  | "normalize-canonical"
  | "validate-graph"
  | "preview-ready"
  | "export-ready";

export interface CoursePipelineStage {
  id: CoursePipelineStageId;
  label: string;
  status: "success" | "failed" | "pending";
  details: string;
}

export interface CoursePipelineSnapshot {
  source: string;
  templateData: Record<string, TemplateScalarValue>;
  sourceObject: unknown | null;
  templateDocument: CourseTemplateDocument | null;
  resolvedTemplate: ResolvedCourseTemplate | null;
  canonicalCourse: CanonicalCourse | null;
  previewModel: CanonicalCourse | null;
  exportModel: CanonicalCourse | null;
  errors: string[];
  warnings: string[];
  failedStageId: CoursePipelineStageId | null;
  stages: CoursePipelineStage[];
  expandedCourseJson: string;
  compiledJson: string;
  templateDataFingerprint: string;
  dependencyGraph: CourseSourceDependencyGraph | null;
}

function serializeTemplateData(
  values: Record<string, TemplateScalarValue>
): string {
  return JSON.stringify(
    Object.entries(values).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    )
  );
}

export function formatPipelinePath(path: PropertyKey[]): string {
  return path.length === 0
    ? "course"
    : path.map((segment) => String(segment)).join(".");
}

function formatZodIssue(
  issue: ZodIssue,
  fallbackPath: PropertyKey[] = []
): string[] {
  const issuePath = issue.path.length > 0 ? issue.path : fallbackPath;
  const path = formatPipelinePath(issuePath);

  if ("errors" in issue && Array.isArray(issue.errors) && issue.errors.length > 0) {
    return issue.errors.flatMap((branch) =>
      branch.flatMap((nestedIssue) =>
        formatZodIssue(nestedIssue, issuePath)
      )
    );
  }

  if ("keys" in issue && Array.isArray(issue.keys) && issue.keys.length > 0) {
    return [
      `${path}: Unknown field${issue.keys.length > 1 ? "s" : ""} ${issue.keys
        .map((key) => `"${String(key)}"`)
        .join(", ")}.`,
    ];
  }

  if (issue.code === "invalid_type" && issue.input === undefined) {
    return [`${path}: This field is required.`];
  }

  return [`${path}: ${issue.message}`];
}

export function formatZodIssues(error: ZodError): string[] {
  return [...new Set(error.issues.flatMap((issue) => formatZodIssue(issue)))];
}

export function parseCourseSourceObject(source: string): unknown {
  return yaml.load(source);
}

export function validateCourseTemplateDocument(
  sourceObject: unknown
): CourseTemplateDocument {
  return courseTemplateDocumentSchema.parse(sourceObject);
}

function createStage(id: CoursePipelineStageId, label: string): CoursePipelineStage {
  return {
    id,
    label,
    status: "pending",
    details: "Waiting for prior stage.",
  };
}

function finalizeStages(
  stages: CoursePipelineStage[],
  failedStageId: CoursePipelineStageId | null,
  errors: string[],
  exportReady: boolean
): CoursePipelineStage[] {
  return stages.map((stage) => {
    if (failedStageId === null && stage.id === "export-ready") {
      return {
        ...stage,
        status: exportReady ? "success" : "failed",
        details: exportReady
          ? "Validated canonical source is ready to generate preview and export builds."
          : errors[0] ?? stage.details,
      };
    }

    if (stage.id === failedStageId) {
      return {
        ...stage,
        status: "failed",
        details: errors[0] ?? "This stage failed.",
      };
    }

    if (stage.status === "success" || stage.id !== "export-ready") {
      return stage;
    }

    return stage;
  });
}

export function runCoursePipeline(
  source: string,
  options: ResolveCourseTemplateOptions = {}
): CoursePipelineSnapshot {
  const templateDataOverrides = options.templateDataOverrides ?? {};
  const stages: CoursePipelineStage[] = [
    createStage("parse-source", "Source parsed"),
    createStage("validate-schema", "Schema valid"),
    createStage("resolve-templates", "Templates resolved"),
    createStage("normalize-canonical", "Canonical model ready"),
    createStage("validate-graph", "References resolved"),
    createStage("preview-ready", "Preview ready"),
    createStage("export-ready", "Export ready"),
  ];

  let sourceObject: unknown | null = null;
  let templateDocument: CourseTemplateDocument | null = null;
  let resolvedTemplate: ResolvedCourseTemplate | null = null;
  let canonicalCourse: CanonicalCourse | null = null;
  let errors: string[] = [];
  let warnings: string[] = [];
  let failedStageId: CoursePipelineStageId | null = null;

  try {
    sourceObject = parseCourseSourceObject(source);
    stages[0] = {
      ...stages[0],
      status: "success",
      details: "YAML source parsed into an intermediate source object.",
    };
  } catch (error) {
    errors =
      error instanceof Error ? [error.message] : ["Unable to parse source YAML."];
    failedStageId = "parse-source";
  }

  if (!failedStageId) {
    try {
      templateDocument = validateCourseTemplateDocument(sourceObject);
      stages[1] = {
        ...stages[1],
        status: "success",
        details: "Source object matches the constrained authoring schema.",
      };
    } catch (error) {
      errors =
        error instanceof ZodError
          ? formatZodIssues(error)
          : error instanceof Error
            ? [error.message]
            : ["Schema validation failed."];
      failedStageId = "validate-schema";
    }
  }

  if (!failedStageId && templateDocument) {
    try {
      resolvedTemplate = resolveCourseTemplate(templateDocument, options);
      warnings = resolvedTemplate.warnings;
      stages[2] = {
        ...stages[2],
        status: "success",
        details: "Template blocks and variables resolved into validated course source.",
      };
    } catch (error) {
      errors =
        error instanceof CourseTemplateResolutionError
          ? error.issues
          : error instanceof Error
            ? [error.message]
            : ["Template resolution failed."];
      failedStageId = "resolve-templates";
    }
  }

  if (!failedStageId && resolvedTemplate) {
    try {
      canonicalCourse = normalizeCourseDocument(resolvedTemplate.document);
      stages[3] = {
        ...stages[3],
        status: "success",
        details:
          "Resolved source normalized into the canonical in-memory course model with derived scene shells and typed render components.",
      };
    } catch (error) {
      errors =
        error instanceof CourseCompilationError
          ? error.issues
          : error instanceof Error
            ? [error.message]
            : ["Canonical normalization failed."];
      failedStageId = "normalize-canonical";
    }
  }

  if (!failedStageId && resolvedTemplate && canonicalCourse) {
    const graphIssues = validateCanonicalCourse(
      resolvedTemplate.document,
      canonicalCourse
    );

    if (graphIssues.length > 0) {
      errors = graphIssues;
      failedStageId = "validate-graph";
    } else {
      warnings = [
        ...warnings,
        ...canonicalCourse.nodeOrder.flatMap((nodeId) =>
          canonicalCourse.nodes[nodeId]
            ? collectNodeSceneWarnings(canonicalCourse.nodes[nodeId])
            : []
        ),
      ];
      stages[4] = {
        ...stages[4],
        status: "success",
        details:
          "Branching references, duplicate ids, score rules, graph constraints, and scene/component validation passed.",
      };
      stages[5] = {
        ...stages[5],
        status: "success",
        details: "Preview consumes the canonical normalized course model.",
      };
    }
  }

  const previewModel = failedStageId ? null : canonicalCourse;
  const exportModel = failedStageId ? null : canonicalCourse;
  const compiledJson = canonicalCourse ? serializeCompiledCourse(canonicalCourse) : "";
  const expandedCourseJson = resolvedTemplate
    ? JSON.stringify(resolvedTemplate.document, null, 2)
    : "";

  return {
    source,
    templateData: templateDataOverrides,
    sourceObject,
    templateDocument,
    resolvedTemplate,
    canonicalCourse,
    previewModel,
    exportModel,
    errors,
    warnings,
    failedStageId,
    stages: finalizeStages(
      stages,
      failedStageId,
      errors,
      Boolean(previewModel && exportModel)
    ),
    expandedCourseJson,
    compiledJson,
    templateDataFingerprint: serializeTemplateData(templateDataOverrides),
    dependencyGraph: resolvedTemplate?.dependencyGraph ?? null,
  };
}
