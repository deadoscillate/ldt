import { ZodError } from "zod";

import { CourseTemplateResolutionError } from "@/lib/course/errors";
import {
  buildTemplateFieldDefinitions,
  validateTemplateVariableValues,
  type TemplateFieldDefinition,
  type TemplateFieldInputType,
  type TemplateVariableSchema,
} from "@/lib/course/template-variables";
import {
  courseDocumentSchema,
  type BlockIncludeDocument,
  type CalloutBlockDocument,
  type CourseDocument,
  type CourseTemplateDocument,
  type CourseTemplateEntryDocument,
  type CourseTemplateNodeDocument,
  type LayoutColumnDocument,
  type MediaDocument,
  type QuoteBlockDocument,
  type TemplateCalloutBlockDocument,
  type TemplateLayoutColumnDocument,
  type TemplateMediaDocument,
  type TemplateQuoteBlockDocument,
  type TemplateScalarValue,
  type TemplateTextValue,
  type ThemeDocument,
} from "@/lib/course/schema";
export type {
  TemplateFieldDefinition,
  TemplateFieldInputType,
  TemplateVariableSchema,
} from "@/lib/course/template-variables";

export interface ResolveCourseTemplateOptions {
  templateDataOverrides?: Record<string, TemplateScalarValue>;
  variableSchema?: TemplateVariableSchema | null;
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
  return path.includes(".body") || path.includes(".callout.text") || path.includes(".quote.text");
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

function interpolateMedia(
  value: TemplateMediaDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): MediaDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    type: value.type,
    src: interpolateString(value.src, templateData, `${path}.src`, issues),
    alt: value.alt
      ? interpolateString(value.alt, templateData, `${path}.alt`, issues)
      : undefined,
    caption: interpolateTextValue(
      value.caption,
      templateData,
      `${path}.caption`,
      issues
    ),
  };
}

function interpolateColumn(
  value: TemplateLayoutColumnDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): LayoutColumnDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    title: value.title
      ? interpolateString(value.title, templateData, `${path}.title`, issues)
      : undefined,
    text: interpolateTextValue(value.text, templateData, `${path}.text`, issues),
    image: value.image
      ? interpolateString(value.image, templateData, `${path}.image`, issues)
      : undefined,
    video: value.video
      ? interpolateString(value.video, templateData, `${path}.video`, issues)
      : undefined,
  };
}

function interpolateQuote(
  value: TemplateQuoteBlockDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): QuoteBlockDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    text:
      interpolateTextValue(value.text, templateData, `${path}.text`, issues) ?? "",
    attribution: value.attribution
      ? interpolateString(
          value.attribution,
          templateData,
          `${path}.attribution`,
          issues
        )
      : undefined,
  };
}

function interpolateCallout(
  value: TemplateCalloutBlockDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): CalloutBlockDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    title: value.title
      ? interpolateString(value.title, templateData, `${path}.title`, issues)
      : undefined,
    text:
      interpolateTextValue(value.text, templateData, `${path}.text`, issues) ?? "",
  };
}

function interpolateTheme(
  value: ThemeDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  issues: string[]
): ThemeDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    primary: value.primary
      ? interpolateString(value.primary, templateData, "course.theme.primary", issues)
      : undefined,
    secondary: value.secondary
      ? interpolateString(
          value.secondary,
          templateData,
          "course.theme.secondary",
          issues
        )
      : undefined,
    font: value.font
      ? interpolateString(value.font, templateData, "course.theme.font", issues)
      : undefined,
    logo: value.logo
      ? interpolateString(value.logo, templateData, "course.theme.logo", issues)
      : undefined,
    background: value.background
      ? interpolateString(
          value.background,
          templateData,
          "course.theme.background",
          issues
        )
      : undefined,
  };
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
  const interpolatedBase = {
    id: interpolateString(node.id, templateData, `${basePath}.id`, issues),
    title: interpolateString(node.title, templateData, `${basePath}.title`, issues),
    body: interpolateTextValue(node.body, templateData, `${basePath}.body`, issues),
    layout: node.layout,
    media: interpolateMedia(node.media, templateData, `${basePath}.media`, issues),
    left: interpolateColumn(node.left, templateData, `${basePath}.left`, issues),
    right: interpolateColumn(node.right, templateData, `${basePath}.right`, issues),
    quote: interpolateQuote(node.quote, templateData, `${basePath}.quote`, issues),
    callout: interpolateCallout(
      node.callout,
      templateData,
      `${basePath}.callout`,
      issues
    ),
  };

  switch (node.type) {
    case "content":
      return {
        ...interpolatedBase,
        type: "content",
        next: interpolateValue(
          node.next,
          templateData,
          `${basePath}.next`,
          issues
        ) as string | undefined,
      };
    case "choice":
    case "branch":
      return {
        ...interpolatedBase,
        type: node.type,
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
        ...interpolatedBase,
        type: "quiz",
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
    case "question":
      return {
        ...interpolatedBase,
        type: "question",
        prompt: interpolateString(
          node.prompt,
          templateData,
          `${basePath}.prompt`,
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
        ...interpolatedBase,
        type: "result",
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
  const mergedTemplateData = {
    ...(sourceDocument.templateData ?? {}),
    ...(options.templateDataOverrides ?? {}),
  };
  const templateValidation = validateTemplateVariableValues(
    mergedTemplateData,
    options.variableSchema ?? null
  );
  const templateData = templateValidation.values;
  const templateFields = buildTemplateFieldDefinitions(
    templateData,
    options.variableSchema ?? null
  );
  const issues: string[] = [];
  issues.push(...templateValidation.issues);
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
    theme: interpolateTheme(sourceDocument.theme, templateData, issues),
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
