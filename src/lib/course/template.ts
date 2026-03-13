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
  type BranchNodeDocument,
  type ChatShellDocument,
  type ChoiceNodeDocument,
  type ContentNodeDocument,
  type CourseDocument,
  type CourseDocumentNode,
  type CourseTemplateDocument,
  type CourseTemplateEntryDocument,
  type CourseTemplateNodeDocument,
  type DashboardShellDocument,
  type EmailShellDocument,
  type QuestionNodeDocument,
  type QuizNodeDocument,
  type ResultNodeDocument,
  type LayoutColumnDocument,
  type MediaDocument,
  type QuoteBlockDocument,
  type ScenarioStateConditionDocument,
  type ScenarioStateRouteDocument,
  type ScenarioStateUpdateDocument,
  type ScenarioStateVariableDocument,
  type ShellInteractionDocument,
  type TemplateChatShellDocument,
  type TemplateCalloutBlockDocument,
  type TemplateDashboardShellDocument,
  type TemplateEmailShellDocument,
  type TemplateLayoutColumnDocument,
  type TemplateMediaDocument,
  type TemplateQuoteBlockDocument,
  type TemplateScalarValue,
  type TemplateShellInteractionDocument,
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
  return (
    path.includes(".body") ||
    path.includes(".callout.text") ||
    path.includes(".quote.text") ||
    path.includes(".email.warningBanner") ||
    path.includes(".chat.systemNotice") ||
    path.includes(".dashboard.notice") ||
    path.includes(".dashboard.cards")
  );
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

function interpolateNumber(
  value: string | number | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): number | undefined {
  const resolved = interpolateValue(value, templateData, path, issues);

  if (resolved === undefined) {
    return undefined;
  }

  if (typeof resolved === "number") {
    return resolved;
  }

  const parsed = Number(resolved);

  if (Number.isNaN(parsed)) {
    issues.push(`${formatIssuePath(path)} must resolve to a number.`);
    return undefined;
  }

  return parsed;
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

function interpolateScenarioStateCondition(
  value: ScenarioStateConditionDocument,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ScenarioStateConditionDocument {
  return {
    variable: interpolateString(value.variable, templateData, `${path}.variable`, issues),
    equals:
      value.equals !== undefined
        ? interpolateScalarValue(value.equals, templateData, `${path}.equals`, issues)
        : undefined,
    notEquals:
      value.notEquals !== undefined
        ? interpolateScalarValue(
            value.notEquals,
            templateData,
            `${path}.notEquals`,
            issues
          )
        : undefined,
    oneOf: value.oneOf?.map((candidate, index) =>
      interpolateScalarValue(candidate, templateData, `${path}.oneOf[${index}]`, issues)
    ),
    gt: value.gt,
    gte: value.gte,
    lt: value.lt,
    lte: value.lte,
  };
}

function interpolateScenarioStateConditions(
  values: ScenarioStateConditionDocument[] | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ScenarioStateConditionDocument[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value, index) =>
    interpolateScenarioStateCondition(
      value,
      templateData,
      `${path}[${index}]`,
      issues
    )
  );
}

function interpolateScenarioStateUpdates(
  values: ScenarioStateUpdateDocument[] | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ScenarioStateUpdateDocument[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value, index) => ({
    variable: interpolateString(
      value.variable,
      templateData,
      `${path}[${index}].variable`,
      issues
    ),
    set:
      value.set !== undefined
        ? interpolateScalarValue(
            value.set,
            templateData,
            `${path}[${index}].set`,
            issues
          )
        : undefined,
    increment: value.increment,
    decrement: value.decrement,
  }));
}

function interpolateScenarioStateRoutes(
  values: ScenarioStateRouteDocument[] | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ScenarioStateRouteDocument[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value, index) => ({
    when:
      interpolateScenarioStateConditions(
        value.when,
        templateData,
        `${path}[${index}].when`,
        issues
      ) ?? [],
    next: interpolateString(value.next, templateData, `${path}[${index}].next`, issues),
  }));
}

function interpolateScenarioStateDefinitions(
  values: Record<string, ScenarioStateVariableDocument> | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): Record<string, ScenarioStateVariableDocument> | undefined {
  if (!values) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      {
        type: value.type,
        initial: interpolateScalarValue(
          value.initial,
          templateData,
          `${path}.${key}.initial`,
          issues
        ),
        description: value.description
          ? interpolateString(
              value.description,
              templateData,
              `${path}.${key}.description`,
              issues
            )
          : undefined,
        options: value.options?.map((option, index) =>
          interpolateString(
            option,
            templateData,
            `${path}.${key}.options[${index}]`,
            issues
          )
        ),
      },
    ])
  );
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
    visibleIf: interpolateScenarioStateConditions(
      value.visibleIf,
      templateData,
      `${path}.visibleIf`,
      issues
    ),
  };
}

function interpolateStringArray(
  values: string[] | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): string[] | undefined {
  if (!values) {
    return undefined;
  }

  return values.map((value, index) =>
    interpolateString(value, templateData, `${path}[${index}]`, issues)
  );
}

function interpolateEmailShell(
  value: TemplateEmailShellDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): EmailShellDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    from: interpolateString(value.from, templateData, `${path}.from`, issues),
    subject: interpolateString(value.subject, templateData, `${path}.subject`, issues),
    previewText: value.previewText
      ? interpolateString(value.previewText, templateData, `${path}.previewText`, issues)
      : undefined,
    attachments: interpolateStringArray(
      value.attachments,
      templateData,
      `${path}.attachments`,
      issues
    ),
    warningBanner: value.warningBanner
      ? interpolateTextValue(value.warningBanner, templateData, `${path}.warningBanner`, issues)
      : undefined,
    warningBannerVisibleIf: interpolateScenarioStateConditions(
      value.warningBannerVisibleIf,
      templateData,
      `${path}.warningBannerVisibleIf`,
      issues
    ),
  };
}

function interpolateChatShell(
  value: TemplateChatShellDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ChatShellDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    title: value.title
      ? interpolateString(value.title, templateData, `${path}.title`, issues)
      : undefined,
    systemNotice: value.systemNotice
      ? interpolateTextValue(value.systemNotice, templateData, `${path}.systemNotice`, issues)
      : undefined,
    systemNoticeVisibleIf: interpolateScenarioStateConditions(
      value.systemNoticeVisibleIf,
      templateData,
      `${path}.systemNoticeVisibleIf`,
      issues
    ),
    messages: value.messages.map((message, index) => ({
      sender: interpolateString(
        message.sender,
        templateData,
        `${path}.messages[${index}].sender`,
        issues
      ),
      text: interpolateString(
        message.text,
        templateData,
        `${path}.messages[${index}].text`,
        issues
      ),
      timestamp: message.timestamp
        ? interpolateString(
            message.timestamp,
            templateData,
            `${path}.messages[${index}].timestamp`,
            issues
          )
        : undefined,
      role: message.role,
      visibleIf: interpolateScenarioStateConditions(
        message.visibleIf,
        templateData,
        `${path}.messages[${index}].visibleIf`,
        issues
      ),
    })),
  };
}

function interpolateDashboardShell(
  value: TemplateDashboardShellDocument | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): DashboardShellDocument | undefined {
  if (!value) {
    return undefined;
  }

  return {
    title: value.title
      ? interpolateString(value.title, templateData, `${path}.title`, issues)
      : undefined,
    navItems: interpolateStringArray(value.navItems, templateData, `${path}.navItems`, issues),
    notice: value.notice
      ? interpolateTextValue(value.notice, templateData, `${path}.notice`, issues)
      : undefined,
    noticeVisibleIf: interpolateScenarioStateConditions(
      value.noticeVisibleIf,
      templateData,
      `${path}.noticeVisibleIf`,
      issues
    ),
    cards: value.cards?.map((card, index) => ({
      title: interpolateString(card.title, templateData, `${path}.cards[${index}].title`, issues),
      text: card.text
        ? interpolateTextValue(card.text, templateData, `${path}.cards[${index}].text`, issues)
        : undefined,
      metricLabel: card.metricLabel
        ? interpolateString(
            card.metricLabel,
            templateData,
            `${path}.cards[${index}].metricLabel`,
            issues
          )
        : undefined,
      metricValue: card.metricValue
        ? interpolateString(
            card.metricValue,
            templateData,
            `${path}.cards[${index}].metricValue`,
            issues
          )
        : undefined,
      status: card.status,
      visibleIf: interpolateScenarioStateConditions(
        card.visibleIf,
        templateData,
        `${path}.cards[${index}].visibleIf`,
        issues
      ),
    })),
  };
}

function interpolateShellInteractions(
  value: TemplateShellInteractionDocument[] | undefined,
  templateData: Record<string, TemplateScalarValue>,
  path: string,
  issues: string[]
): ShellInteractionDocument[] | undefined {
  if (!value) {
    return undefined;
  }

  const nextInteractions: ShellInteractionDocument[] = [];

  value.forEach((interaction, index) => {
    const interactionPath = `${path}[${index}]`;
    const feedback: string | undefined = interaction.feedback
      ? interpolateTextValue(
          interaction.feedback,
          templateData,
          `${interactionPath}.feedback`,
          issues
        )
      : undefined;

    switch (interaction.type) {
      case "email_link":
        nextInteractions.push({
          type: "email_link" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          label: interpolateString(
            interaction.label,
            templateData,
            `${interactionPath}.label`,
            issues
          ),
          hrefLabel: interaction.hrefLabel
            ? interpolateString(
                interaction.hrefLabel,
                templateData,
                `${interactionPath}.hrefLabel`,
                issues
              )
            : undefined,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "email_attachment":
        nextInteractions.push({
          type: "email_attachment" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          label: interpolateString(
            interaction.label,
            templateData,
            `${interactionPath}.label`,
            issues
          ),
          fileName: interaction.fileName
            ? interpolateString(
                interaction.fileName,
                templateData,
                `${interactionPath}.fileName`,
                issues
              )
            : undefined,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "email_action_button":
        nextInteractions.push({
          type: "email_action_button" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          label: interpolateString(
            interaction.label,
            templateData,
            `${interactionPath}.label`,
            issues
          ),
          variant: interaction.variant,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "chat_reply_option":
        nextInteractions.push({
          type: "chat_reply_option" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          label: interpolateString(
            interaction.label,
            templateData,
            `${interactionPath}.label`,
            issues
          ),
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "chat_choice_message":
        nextInteractions.push({
          type: "chat_choice_message" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          sender: interpolateString(
            interaction.sender,
            templateData,
            `${interactionPath}.sender`,
            issues
          ),
          text: interpolateString(
            interaction.text,
            templateData,
            `${interactionPath}.text`,
            issues
          ),
          timestamp: interaction.timestamp
            ? interpolateString(
                interaction.timestamp,
                templateData,
                `${interactionPath}.timestamp`,
                issues
              )
            : undefined,
          role: interaction.role,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "dashboard_action_card":
        nextInteractions.push({
          type: "dashboard_action_card" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          title: interpolateString(
            interaction.title,
            templateData,
            `${interactionPath}.title`,
            issues
          ),
          text:
            interpolateTextValue(
              interaction.text,
              templateData,
              `${interactionPath}.text`,
              issues
            ) ?? undefined,
          status: interaction.status,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "dashboard_flag_toggle":
        nextInteractions.push({
          type: "dashboard_flag_toggle" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          label: interpolateString(
            interaction.label,
            templateData,
            `${interactionPath}.label`,
            issues
          ),
          status: interaction.status,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
      case "dashboard_review_item":
        nextInteractions.push({
          type: "dashboard_review_item" as const,
          id: interpolateString(interaction.id, templateData, `${interactionPath}.id`, issues),
          optionId: interpolateString(
            interaction.optionId,
            templateData,
            `${interactionPath}.optionId`,
            issues
          ),
          title: interpolateString(
            interaction.title,
            templateData,
            `${interactionPath}.title`,
            issues
          ),
          text:
            interpolateTextValue(
              interaction.text,
              templateData,
              `${interactionPath}.text`,
              issues
            ) ?? undefined,
          status: interaction.status,
          feedback,
          visibleIf: interpolateScenarioStateConditions(
            interaction.visibleIf,
            templateData,
            `${interactionPath}.visibleIf`,
            issues
          ),
        });
        return;
    }

    issues.push(`${interactionPath}.type is not supported.`);
  });

  return nextInteractions;
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

function validateSharedModuleTemplateData(input: {
  inheritedTemplateData: Record<string, TemplateScalarValue>;
  moduleTemplateData: Record<string, TemplateScalarValue>;
  includeOverrides: Record<string, TemplateScalarValue>;
  variableSchema: TemplateVariableSchema | null;
  issuePath: string;
  issues: string[];
}): Record<string, TemplateScalarValue> {
  if (!input.variableSchema) {
    return {
      ...input.inheritedTemplateData,
      ...input.moduleTemplateData,
      ...input.includeOverrides,
    };
  }

  const declaredKeys = Object.keys(input.variableSchema.variables);
  const inheritedDeclaredValues = Object.fromEntries(
    declaredKeys.flatMap((key) =>
      key in input.inheritedTemplateData
        ? [[key, input.inheritedTemplateData[key]]]
        : []
    )
  );
  const validated = validateTemplateVariableValues(
    {
      ...inheritedDeclaredValues,
      ...input.moduleTemplateData,
      ...input.includeOverrides,
    },
    input.variableSchema
  );

  validated.issues.forEach((issue) => {
    input.issues.push(`${formatIssuePath(input.issuePath)}: ${issue}`);
  });

  return {
    ...input.inheritedTemplateData,
    ...validated.values,
  };
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
    const moduleTemplateData = validateSharedModuleTemplateData({
      inheritedTemplateData: context.templateData,
      moduleTemplateData: module.templateData ?? {},
      includeOverrides,
      variableSchema: module.variableSchema,
      issuePath: `${entryPath}.include.with`,
      issues: context.issues,
    });

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
): CourseDocumentNode {
  const basePath = path;
  const interpolatedBase = {
    id: interpolateString(node.id, templateData, `${basePath}.id`, issues),
    title: interpolateString(node.title, templateData, `${basePath}.title`, issues),
    body: interpolateTextValue(node.body, templateData, `${basePath}.body`, issues),
    layout: node.layout,
    shell: node.shell,
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
    email: interpolateEmailShell(node.email, templateData, `${basePath}.email`, issues),
    chat: interpolateChatShell(node.chat, templateData, `${basePath}.chat`, issues),
    dashboard: interpolateDashboardShell(
      node.dashboard,
      templateData,
      `${basePath}.dashboard`,
      issues
    ),
    interactions: interpolateShellInteractions(
      node.interactions,
      templateData,
      `${basePath}.interactions`,
      issues
    ) as ShellInteractionDocument[] | undefined,
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
        nextWhen: interpolateScenarioStateRoutes(
          node.nextWhen,
          templateData,
          `${basePath}.nextWhen`,
          issues
        ),
      } as ContentNodeDocument;
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
          score:
            interpolateNumber(
              option.score,
              templateData,
              `${basePath}.options[${optionIndex}].score`,
              issues
            ) ?? 0,
          feedback: option.feedback
            ? interpolateTextValue(
                option.feedback,
                templateData,
                `${basePath}.options[${optionIndex}].feedback`,
                issues
              )
            : undefined,
          stateUpdates: interpolateScenarioStateUpdates(
            option.stateUpdates,
            templateData,
            `${basePath}.options[${optionIndex}].stateUpdates`,
            issues
          ),
          nextWhen: interpolateScenarioStateRoutes(
            option.nextWhen,
            templateData,
            `${basePath}.options[${optionIndex}].nextWhen`,
            issues
          ),
        })),
      } as ChoiceNodeDocument | BranchNodeDocument;
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
          feedback: option.feedback
            ? interpolateTextValue(
                option.feedback,
                templateData,
                `${basePath}.options[${optionIndex}].feedback`,
                issues
              )
            : undefined,
          stateUpdates: interpolateScenarioStateUpdates(
            option.stateUpdates,
            templateData,
            `${basePath}.options[${optionIndex}].stateUpdates`,
            issues
          ),
        })),
        correctScore: interpolateNumber(
          node.correctScore,
          templateData,
          `${basePath}.correctScore`,
          issues
        ),
        incorrectScore: interpolateNumber(
          node.incorrectScore,
          templateData,
          `${basePath}.incorrectScore`,
          issues
        ),
        passNext: interpolateValue(
          node.passNext,
          templateData,
          `${basePath}.passNext`,
          issues
        ) as string | undefined,
        passNextWhen: interpolateScenarioStateRoutes(
          node.passNextWhen,
          templateData,
          `${basePath}.passNextWhen`,
          issues
        ),
        failNext: interpolateValue(
          node.failNext,
          templateData,
          `${basePath}.failNext`,
          issues
        ) as string | undefined,
        failNextWhen: interpolateScenarioStateRoutes(
          node.failNextWhen,
          templateData,
          `${basePath}.failNextWhen`,
          issues
        ),
        next: interpolateValue(
          node.next,
          templateData,
          `${basePath}.next`,
          issues
        ) as string | undefined,
        nextWhen: interpolateScenarioStateRoutes(
          node.nextWhen,
          templateData,
          `${basePath}.nextWhen`,
          issues
        ),
      } as QuizNodeDocument;
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
          feedback: option.feedback
            ? interpolateTextValue(
                option.feedback,
                templateData,
                `${basePath}.options[${optionIndex}].feedback`,
                issues
              )
            : undefined,
          stateUpdates: interpolateScenarioStateUpdates(
            option.stateUpdates,
            templateData,
            `${basePath}.options[${optionIndex}].stateUpdates`,
            issues
          ),
        })),
        correctScore: interpolateNumber(
          node.correctScore,
          templateData,
          `${basePath}.correctScore`,
          issues
        ),
        incorrectScore: interpolateNumber(
          node.incorrectScore,
          templateData,
          `${basePath}.incorrectScore`,
          issues
        ),
        passNext: interpolateValue(
          node.passNext,
          templateData,
          `${basePath}.passNext`,
          issues
        ) as string | undefined,
        passNextWhen: interpolateScenarioStateRoutes(
          node.passNextWhen,
          templateData,
          `${basePath}.passNextWhen`,
          issues
        ),
        failNext: interpolateValue(
          node.failNext,
          templateData,
          `${basePath}.failNext`,
          issues
        ) as string | undefined,
        failNextWhen: interpolateScenarioStateRoutes(
          node.failNextWhen,
          templateData,
          `${basePath}.failNextWhen`,
          issues
        ),
        next: interpolateValue(
          node.next,
          templateData,
          `${basePath}.next`,
          issues
        ) as string | undefined,
        nextWhen: interpolateScenarioStateRoutes(
          node.nextWhen,
          templateData,
          `${basePath}.nextWhen`,
          issues
        ),
      } as QuestionNodeDocument;
    case "result":
      return {
        ...interpolatedBase,
        type: "result",
        outcome: node.outcome,
      } as ResultNodeDocument;
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
    state: interpolateScenarioStateDefinitions(
      sourceDocument.state,
      templateData,
      "course.state",
      issues
    ),
    start: interpolateString(
      sourceDocument.start,
      templateData,
      "course.start",
      issues
    ),
    passingScore:
      interpolateNumber(
      sourceDocument.passingScore,
      templateData,
      "course.passingScore",
      issues
      ) ?? 0,
    nodes: expandedNodes.map((node, index) =>
      interpolateNode(node, templateData, `nodes[${index}]`, issues)
    ) as CourseDocumentNode[],
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
