import { ZodError } from "zod";

import { CourseTemplateResolutionError } from "@/lib/course/errors";
import {
  courseDocumentSchema,
  type BlockIncludeDocument,
  type CourseDocument,
  type CourseTemplateDocument,
  type CourseTemplateEntryDocument,
  type CourseTemplateNodeDocument,
  type TemplateScalarValue,
  type TemplateTextValue,
} from "@/lib/course/schema";

export type TemplateFieldInputType = "text" | "number" | "boolean";

export interface TemplateFieldDefinition {
  key: string;
  value: TemplateScalarValue;
  inputType: TemplateFieldInputType;
}

export interface ResolveCourseTemplateOptions {
  templateDataOverrides?: Record<string, TemplateScalarValue>;
}

export interface ResolvedCourseTemplate {
  document: CourseDocument;
  templateData: Record<string, TemplateScalarValue>;
  templateFields: TemplateFieldDefinition[];
}

const placeholderPattern = /{{\s*([A-Za-z0-9_-]+)\s*}}/g;
const runtimePlaceholderKeys = new Set([
  "score",
  "maxScore",
  "passingScore",
  "percent",
  "courseTitle",
]);

function isBlockIncludeEntry(
  entry: CourseTemplateEntryDocument
): entry is BlockIncludeDocument {
  return "include" in entry;
}

function formatIssuePath(path: string): string {
  return path.length > 0 ? path : "course";
}

function allowsRuntimePlaceholders(path: string): boolean {
  return path.includes(".body");
}

function inferTemplateFieldType(value: TemplateScalarValue): TemplateFieldInputType {
  switch (typeof value) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "text";
  }
}

function buildTemplateFieldDefinitions(
  templateData: Record<string, TemplateScalarValue>
): TemplateFieldDefinition[] {
  return Object.entries(templateData).map(([key, value]) => ({
    key,
    value,
    inputType: inferTemplateFieldType(value),
  }));
}

function interpolateString(
  value: string,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): string {
  return value.replace(placeholderPattern, (match, key: string) => {
    if (!(key in templateData)) {
      if (runtimePlaceholderKeys.has(key) && allowsRuntimePlaceholders(path)) {
        return match;
      }

      issues.push(
        `${formatIssuePath(path)} references missing placeholder "${key}".`
      );
      return match;
    }

    return String(templateData[key]);
  });
}

function interpolateTextValue(
  value: TemplateTextValue | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((line, index) =>
        interpolateString(line, templateData, `${path}[${index}]`, issues)
      )
      .join("\n");
  }

  return interpolateString(value, templateData, path, issues);
}

function interpolateValue(
  value: string | number | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): string | number | undefined {
  if (value === undefined || typeof value === "number") {
    return value;
  }

  return interpolateString(value, templateData, path, issues);
}

function expandEntries(
  entries: CourseTemplateEntryDocument[],
  blocks: Record<string, CourseTemplateEntryDocument[]>,
  issues: string[],
  path: string,
  includeStack: string[]
): CourseTemplateNodeDocument[] {
  const expandedNodes: CourseTemplateNodeDocument[] = [];

  entries.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;

    if (!isBlockIncludeEntry(entry)) {
      expandedNodes.push(entry);
      return;
    }

    const blockEntries = blocks[entry.include];

    if (!blockEntries) {
      issues.push(
        `${formatIssuePath(entryPath)} references missing block "${entry.include}".`
      );
      return;
    }

    if (includeStack.includes(entry.include)) {
      issues.push(
        `${formatIssuePath(entryPath)} creates a circular block include: ${[
          ...includeStack,
          entry.include,
        ].join(" -> ")}.`
      );
      return;
    }

    expandedNodes.push(
      ...expandEntries(
        blockEntries,
        blocks,
        issues,
        `blocks.${entry.include}`,
        [...includeStack, entry.include]
      )
    );
  });

  return expandedNodes;
}

function interpolateNode(
  node: CourseTemplateNodeDocument,
  templateData: Record<string, TemplateScalarValue>,
  index: number,
  issues: string[]
): Record<string, unknown> {
  const basePath = `nodes[${index}]`;
  const interpolatedId = interpolateString(node.id, templateData, `${basePath}.id`, issues);
  const interpolatedTitle = interpolateString(
    node.title,
    templateData,
    `${basePath}.title`,
    issues
  );
  const interpolatedBody = interpolateTextValue(
    node.body,
    templateData,
    `${basePath}.body`,
    issues
  );

  switch (node.type) {
    case "content":
      return {
        id: interpolatedId,
        type: "content",
        title: interpolatedTitle,
        body: interpolatedBody,
        next: interpolateValue(
          node.next,
          templateData,
          `${basePath}.next`,
          issues
        ) as string | undefined,
      };
    case "choice":
      return {
        id: interpolatedId,
        type: "choice",
        title: interpolatedTitle,
        body: interpolatedBody,
        options: node.options.map((option, optionIndex) => ({
          id: interpolateString(
            option.id,
            templateData,
            `${basePath}.options[${optionIndex}].id`,
            issues
          ),
          label: interpolateString(
            option.label,
            templateData,
            `${basePath}.options[${optionIndex}].label`,
            issues
          ),
          next: interpolateString(
            option.next,
            templateData,
            `${basePath}.options[${optionIndex}].next`,
            issues
          ),
          score: interpolateValue(
            option.score,
            templateData,
            `${basePath}.options[${optionIndex}].score`,
            issues
          ) as string | number | undefined,
        })),
      };
    case "quiz":
      return {
        id: interpolatedId,
        type: "quiz",
        title: interpolatedTitle,
        body: interpolatedBody,
        question: interpolateString(
          node.question,
          templateData,
          `${basePath}.question`,
          issues
        ),
        multiple: node.multiple,
        options: node.options.map((option, optionIndex) => ({
          id: interpolateString(
            option.id,
            templateData,
            `${basePath}.options[${optionIndex}].id`,
            issues
          ),
          label: interpolateString(
            option.label,
            templateData,
            `${basePath}.options[${optionIndex}].label`,
            issues
          ),
          correct: option.correct,
        })),
        correctScore: interpolateValue(
          node.correctScore,
          templateData,
          `${basePath}.correctScore`,
          issues
        ) as string | number | undefined,
        incorrectScore: interpolateValue(
          node.incorrectScore,
          templateData,
          `${basePath}.incorrectScore`,
          issues
        ) as string | number | undefined,
        passNext: interpolateValue(
          node.passNext,
          templateData,
          `${basePath}.passNext`,
          issues
        ) as string | undefined,
        failNext: interpolateValue(
          node.failNext,
          templateData,
          `${basePath}.failNext`,
          issues
        ) as string | undefined,
        next: interpolateValue(
          node.next,
          templateData,
          `${basePath}.next`,
          issues
        ) as string | undefined,
      };
    case "result":
      return {
        id: interpolatedId,
        type: "result",
        title: interpolatedTitle,
        body: interpolatedBody,
        outcome: node.outcome,
      };
  }
}

function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : "course";

    return `${path}: ${issue.message}`;
  });
}

export function resolveCourseTemplate(
  sourceDocument: CourseTemplateDocument,
  options: ResolveCourseTemplateOptions = {}
): ResolvedCourseTemplate {
  const templateData = {
    ...(sourceDocument.templateData ?? {}),
    ...(options.templateDataOverrides ?? {}),
  };
  const templateFields = buildTemplateFieldDefinitions(templateData);
  const issues: string[] = [];
  const expandedNodes = expandEntries(
    sourceDocument.nodes,
    sourceDocument.blocks ?? {},
    issues,
    "nodes",
    []
  );

  const candidateDocument = {
    id: interpolateString(sourceDocument.id, templateData, "course.id", issues),
    title: interpolateString(
      sourceDocument.title,
      templateData,
      "course.title",
      issues
    ),
    description: sourceDocument.description
      ? interpolateString(
          sourceDocument.description,
          templateData,
          "course.description",
          issues
        )
      : "",
    start: interpolateString(
      sourceDocument.start,
      templateData,
      "course.start",
      issues
    ),
    passingScore: interpolateValue(
      sourceDocument.passingScore,
      templateData,
      "course.passingScore",
      issues
    ),
    nodes: expandedNodes.map((node, index) =>
      interpolateNode(node, templateData, index, issues)
    ),
  };

  if (issues.length > 0) {
    throw new CourseTemplateResolutionError(issues);
  }

  try {
    return {
      document: courseDocumentSchema.parse(candidateDocument),
      templateData,
      templateFields,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CourseTemplateResolutionError(formatZodIssues(error));
    }

    throw error;
  }
}
