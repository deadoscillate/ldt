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
  courseTemplateNodeSchema,
  isBlockIncludeEntry,
  isModuleIncludeEntry,
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
import type {
  CourseSourceDependencyGraph,
  DependencyGraphEdge,
  ModuleDependencyRecord,
} from "@/lib/module-library/dependency";
import { resolveSharedModule } from "@/lib/module-library/resolve";
import type { SharedModuleLibrary } from "@/lib/module-library/schema";

export type {
  TemplateFieldDefinition,
  TemplateFieldInputType,
  TemplateVariableSchema,
} from "@/lib/course/template-variables";

export interface ResolveCourseTemplateOptions {
  templateDataOverrides?: Record<string, TemplateScalarValue>;
  variableSchema?: TemplateVariableSchema | null;
  moduleLibrary?: SharedModuleLibrary | null;
}

export interface ResolvedCourseTemplate {
  document: CourseDocument;
  templateData: Record<string, TemplateScalarValue>;
  templateFields: TemplateFieldDefinition[];
  warnings: string[];
  dependencyGraph: CourseSourceDependencyGraph;
}

interface ExpandEntriesContext {
  blocks: Record<string, CourseTemplateEntryDocument[]>;
  templateData: Record<string, TemplateScalarValue>;
  issues: string[];
  warnings: string[];
  moduleLibrary: SharedModuleLibrary | null;
  dependencyMap: Map<string, ModuleDependencyRecord>;
  dependencyEdges: DependencyGraphEdge[];
  blockStack: string[];
  moduleStack: string[];
  currentDependencyNode: string;
}

const placeholderPattern = /{{\s*([A-Za-z0-9_-]+)\s*}}/g;
const runtimePlaceholderKeys = new Set([
  "score",
  "maxScore",
  "passingScore",
  "percent",
  "courseTitle",
]);

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

function interpolateScalarValue(
  value: TemplateScalarValue,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): TemplateScalarValue {
  if (typeof value !== "string") {
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

function addDependencyEdge(
  dependencyEdges: DependencyGraphEdge[],
  edge: DependencyGraphEdge
): void {
  if (
    dependencyEdges.some(
      (candidate) =>
        candidate.from === edge.from &&
        candidate.to === edge.to &&
        candidate.type === edge.type
    )
  ) {
    return;
  }

  dependencyEdges.push(edge);
}

function registerModuleDependency(
  context: ExpandEntriesContext,
  dependency: ModuleDependencyRecord
): void {
  const moduleKey = `${dependency.moduleId}@${dependency.version}`;

  if (!context.dependencyMap.has(moduleKey)) {
    context.dependencyMap.set(moduleKey, dependency);
  }

  addDependencyEdge(context.dependencyEdges, {
    from: context.currentDependencyNode,
    to: `module:${moduleKey}`,
    type:
      context.currentDependencyNode === "course"
        ? "course-uses-module"
        : "module-includes-module",
  });
}

function expandEntries(
  entries: CourseTemplateEntryDocument[],
  context: ExpandEntriesContext,
  path: string
): CourseTemplateNodeDocument[] {
  const expandedNodes: CourseTemplateNodeDocument[] = [];

  entries.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;

    if (!("include" in entry)) {
      expandedNodes.push(entry);
      return;
    }

    if (isBlockIncludeEntry(entry)) {
      const blockEntries = context.blocks[entry.include];

      if (!blockEntries) {
        context.issues.push(
          `${formatIssuePath(entryPath)} references missing block "${entry.include}".`
        );
        return;
      }

      if (context.blockStack.includes(entry.include)) {
        context.issues.push(
          `${formatIssuePath(entryPath)} creates a circular block include: ${[
            ...context.blockStack,
            entry.include,
          ].join(" -> ")}.`
        );
        return;
      }

      expandedNodes.push(
        ...expandEntries(
          blockEntries,
          {
            ...context,
            blockStack: [...context.blockStack, entry.include],
          },
          `blocks.${entry.include}`
        )
      );
      return;
    }

    if (!context.moduleLibrary) {
      context.issues.push(
        `${formatIssuePath(entryPath)} references shared module "${entry.include.module}" but no module library is loaded.`
      );
      return;
    }

    const resolvedModule = resolveSharedModule(
      context.moduleLibrary,
      entry.include.module,
      entry.include.version ?? null
    );

    if (!resolvedModule.module) {
      if (resolvedModule.latest && resolvedModule.requestedVersion) {
        context.issues.push(
          `${formatIssuePath(entryPath)} pins shared module "${entry.include.module}" version "${resolvedModule.requestedVersion}", but only version "${resolvedModule.latest.version}" is currently available.`
        );
      } else {
        context.issues.push(
          `${formatIssuePath(entryPath)} references missing shared module "${entry.include.module}".`
        );
      }
      return;
    }

    const module = resolvedModule.module;
    const moduleKey = `${module.id}@${module.version}`;

    if (context.moduleStack.includes(moduleKey)) {
      context.issues.push(
        `${formatIssuePath(entryPath)} creates a circular module include: ${[
          ...context.moduleStack,
          moduleKey,
        ].join(" -> ")}.`
      );
      return;
    }

    if (!resolvedModule.requestedVersion) {
      context.warnings.push(
        `${formatIssuePath(entryPath)} resolves shared module "${module.id}" to the latest available version "${module.version}". Pin the version for fully reproducible source.`
      );
    } else if (
      resolvedModule.latest &&
      resolvedModule.latest.version !== module.version
    ) {
      context.warnings.push(
        `${formatIssuePath(entryPath)} pins shared module "${module.id}" at "${module.version}" while a newer version "${resolvedModule.latest.version}" exists.`
      );
    }

    if (module.deprecated) {
      context.warnings.push(
        `${formatIssuePath(entryPath)} uses deprecated shared module "${module.id}" version "${module.version}".`
      );
    }

    registerModuleDependency(context, {
      moduleId: module.id,
      title: module.title,
      version: module.version,
      sourcePath: module.sourcePath,
      category: module.category,
      tags: module.tags,
      deprecated: module.deprecated,
      requestedVersion: resolvedModule.requestedVersion,
      resolution: resolvedModule.requestedVersion ? "pinned" : "latest",
      includedFrom: formatIssuePath(entryPath),
    });

    const includeOverrides = Object.fromEntries(
      Object.entries(entry.include.with ?? {}).map(([key, value]) => [
        key,
        interpolateScalarValue(
          value,
          context.templateData,
          `${entryPath}.include.with.${key}`,
          context.issues
        ),
      ])
    );
    const moduleTemplateData = {
      ...context.templateData,
      ...(module.templateData ?? {}),
      ...includeOverrides,
    };

    const moduleNodes = expandEntries(
        module.nodes,
        {
          ...context,
          blocks: module.blocks,
          templateData: moduleTemplateData,
          blockStack: [],
          moduleStack: [...context.moduleStack, moduleKey],
          currentDependencyNode: `module:${moduleKey}`,
        },
        `modules.${module.id}@${module.version}.nodes`
      );
    moduleNodes.forEach((moduleNode, moduleIndex) => {
      try {
        expandedNodes.push(
          courseTemplateNodeSchema.parse(
            interpolateNode(
              moduleNode,
              moduleTemplateData,
              `modules.${module.id}@${module.version}.nodes[${moduleIndex}]`,
              context.issues
            )
          )
        );
      } catch (error) {
        if (error instanceof ZodError) {
          context.issues.push(...formatZodIssues(error));
          return;
        }

        throw error;
      }
    });
  });

  return expandedNodes;
}

function interpolateNode(
  node: CourseTemplateNodeDocument,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): Record<string, unknown> {
  const basePath = path;
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
  const warnings: string[] = [];
  const dependencyMap = new Map<string, ModuleDependencyRecord>();
  const dependencyEdges: DependencyGraphEdge[] = [];

  issues.push(...templateValidation.issues);
  const expandedNodes = expandEntries(
    sourceDocument.nodes,
    {
      blocks: sourceDocument.blocks ?? {},
      templateData,
      issues,
      warnings,
      moduleLibrary: options.moduleLibrary ?? null,
      dependencyMap,
      dependencyEdges,
      blockStack: [],
      moduleStack: [],
      currentDependencyNode: "course",
    },
    "nodes"
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
      interpolateNode(node, templateData, `nodes[${index}]`, issues)
    ),
  };

  if (issues.length > 0) {
    throw new CourseTemplateResolutionError(issues);
  }

  try {
    const document = courseDocumentSchema.parse(candidateDocument);
    const dependencyGraph: CourseSourceDependencyGraph = {
      sourceFiles:
        dependencyMap.size > 0 && options.moduleLibrary
          ? [
              options.moduleLibrary.registryPath,
              ...[...dependencyMap.values()].map(
                (dependency) => dependency.sourcePath
              ),
            ].sort((leftPath, rightPath) => leftPath.localeCompare(rightPath))
          : [],
      moduleDependencies: [...dependencyMap.values()].sort((leftDependency, rightDependency) =>
        `${leftDependency.moduleId}@${leftDependency.version}`.localeCompare(
          `${rightDependency.moduleId}@${rightDependency.version}`
        )
      ),
      edges: dependencyEdges,
    };

    return {
      document,
      templateData,
      templateFields,
      warnings: [...new Set(warnings)],
      dependencyGraph,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CourseTemplateResolutionError(formatZodIssues(error));
    }

    throw error;
  }
}
