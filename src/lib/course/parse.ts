import { ZodError } from "zod";

import {
  CourseCompilationError,
} from "@/lib/course/compile";
import {
  CourseTemplateResolutionError,
  CourseValidationError,
} from "@/lib/course/errors";
import {
  formatZodIssues,
  parseCourseSourceObject,
  runCoursePipeline,
  validateCourseTemplateDocument,
} from "@/lib/course/pipeline";
import type {
  CoursePipelineSnapshot,
} from "@/lib/course/pipeline";
import type {
  CourseTemplateDocument,
  TemplateScalarValue,
} from "@/lib/course/schema";
import {
  buildTemplateFieldDefinitions,
  type TemplateVariableSchema,
} from "@/lib/course/template-variables";
import type {
  ResolveCourseTemplateOptions,
  TemplateFieldDefinition,
} from "@/lib/course/template";
import type { CanonicalCourse } from "@/lib/course/types";

export interface ParsedCourseBundle {
  course: CanonicalCourse;
  resolvedTemplate: NonNullable<CoursePipelineSnapshot["resolvedTemplate"]>;
}

function isTemplateScalarValue(value: unknown): value is TemplateScalarValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function collectCourseErrorMessages(error: unknown): string[] {
  if (
    error instanceof CourseValidationError ||
    error instanceof CourseCompilationError ||
    error instanceof CourseTemplateResolutionError
  ) {
    return error.issues;
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ["Unknown course error."];
}

export function parseCourseTemplateYaml(source: string): CourseTemplateDocument {
  try {
    return validateCourseTemplateDocument(parseCourseSourceObject(source));
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CourseValidationError(formatZodIssues(error));
    }

    if (error instanceof Error) {
      throw new CourseValidationError([error.message]);
    }

    throw error;
  }
}

export function inspectTemplateFields(source: string): TemplateFieldDefinition[] | null {
  try {
    const parsedDocument = parseCourseSourceObject(source);

    if (
      !parsedDocument ||
      typeof parsedDocument !== "object" ||
      Array.isArray(parsedDocument)
    ) {
      return [];
    }

    const templateData = (parsedDocument as Record<string, unknown>).templateData;

    if (!templateData || typeof templateData !== "object" || Array.isArray(templateData)) {
      return [];
    }

    return buildTemplateFieldDefinitions(
      Object.fromEntries(
        Object.entries(templateData).flatMap(([key, value]) =>
          isTemplateScalarValue(value) ? [[key, value]] : []
        )
      )
    );
  } catch {
    return null;
  }
}

export function inspectTemplateFieldsWithOverrides(
  source: string,
  overrides: Record<string, TemplateScalarValue>,
  variableSchema: TemplateVariableSchema | null = null
): TemplateFieldDefinition[] | null {
  try {
    const parsedDocument = parseCourseTemplateYaml(source);
    return buildTemplateFieldDefinitions(
      {
        ...(parsedDocument.templateData ?? {}),
        ...overrides,
      },
      variableSchema
    );
  } catch {
    return null;
  }
}

function throwPipelineErrors(snapshot: CoursePipelineSnapshot): never {
  switch (snapshot.failedStageId) {
    case "parse-source":
    case "validate-schema":
      throw new CourseValidationError(snapshot.errors);
    case "resolve-templates":
      throw new CourseTemplateResolutionError(snapshot.errors);
    case "normalize-canonical":
    case "validate-graph":
      throw new CourseCompilationError(snapshot.errors);
    default:
      throw new Error(snapshot.errors[0] ?? "Course pipeline failed.");
  }
}

export function parseAndCompileCourseBundle(
  source: string,
  options: ResolveCourseTemplateOptions = {}
): ParsedCourseBundle {
  const snapshot = runCoursePipeline(source, options);

  if (!snapshot.canonicalCourse || !snapshot.resolvedTemplate || snapshot.errors.length > 0) {
    throwPipelineErrors(snapshot);
  }

  return {
    course: snapshot.canonicalCourse,
    resolvedTemplate: snapshot.resolvedTemplate,
  };
}

export function parseAndCompileCourse(
  source: string,
  options: ResolveCourseTemplateOptions = {}
): CanonicalCourse {
  return parseAndCompileCourseBundle(source, options).course;
}
