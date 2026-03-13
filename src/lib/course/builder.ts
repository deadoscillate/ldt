import yaml from "js-yaml";

import type {
  CalloutBlockDocument,
  ChatShellDocument,
  CourseTemplateDocument,
  DashboardShellDocument,
  EmailShellDocument,
  LayoutColumnDocument,
  MediaDocument,
  QuoteBlockDocument,
  ScenarioStateConditionDocument,
  ScenarioStateRouteDocument,
  ScenarioStateUpdateDocument,
  ScenarioStateVariableDocument,
  ShellInteractionDocument,
  TemplateScalarValue,
} from "@/lib/course/schema";
import type {
  AuthorSceneShell,
  CompiledCalloutBlock,
  CompiledChatShell,
  CompiledDashboardShell,
  CompiledCourse,
  CompiledLayoutColumn,
  CompiledEmailShell,
  CompiledMedia,
  CompiledNode,
  CompiledQuoteBlock,
  CourseLayoutType,
  PublicAuthorNodeType,
  ShellInteractionType,
  ScenarioStateCondition,
  ScenarioStateRoute,
  ScenarioStateUpdate,
  ScenarioStateVariableDefinition,
} from "@/lib/course/types";

export type BuilderStateConditionOperator =
  | "equals"
  | "notEquals"
  | "oneOf"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type BuilderStateUpdateMode = "set" | "increment" | "decrement";

export interface BuilderScenarioStateVariable {
  id: string;
  type: ScenarioStateVariableDocument["type"];
  initial: string;
  description: string;
  optionsText: string;
}

export interface BuilderStateCondition {
  variable: string;
  operator: BuilderStateConditionOperator;
  value: string;
}

export interface BuilderStateRoute {
  next: string;
  conditions: BuilderStateCondition[];
}

export interface BuilderStateUpdate {
  variable: string;
  mode: BuilderStateUpdateMode;
  value: string;
}

export interface BuilderChoiceOption {
  id: string;
  label: string;
  next: string;
  score: string;
  correct: boolean;
  stateUpdates: BuilderStateUpdate[];
  nextWhen: BuilderStateRoute[];
}

export interface BuilderChatMessage {
  sender: string;
  text: string;
  timestamp: string;
  role: "self" | "other";
  visibleIf: BuilderStateCondition[];
}

export interface BuilderDashboardCard {
  title: string;
  text: string;
  metricLabel: string;
  metricValue: string;
  status: "neutral" | "warning" | "positive" | "danger";
  visibleIf: BuilderStateCondition[];
}

export interface BuilderShellInteraction {
  id: string;
  type: ShellInteractionType;
  optionId: string;
  label: string;
  title: string;
  text: string;
  hrefLabel: string;
  fileName: string;
  variant: "primary" | "secondary";
  status: "neutral" | "warning" | "positive" | "danger";
  sender: string;
  timestamp: string;
  role: "self" | "other";
  feedback: string;
  visibleIf: BuilderStateCondition[];
}

export interface BuilderNode {
  id: string;
  type: PublicAuthorNodeType;
  title: string;
  body: string;
  layout: CourseLayoutType;
  shell: AuthorSceneShell;
  next: string;
  nextWhen: BuilderStateRoute[];
  prompt: string;
  multiple: boolean;
  correctScore: string;
  incorrectScore: string;
  passNext: string;
  passNextWhen: BuilderStateRoute[];
  failNext: string;
  failNextWhen: BuilderStateRoute[];
  outcome: "passed" | "failed" | "neutral";
  mediaType: "image" | "video";
  mediaSrc: string;
  mediaAlt: string;
  mediaCaption: string;
  leftTitle: string;
  leftText: string;
  leftImage: string;
  leftVideo: string;
  rightTitle: string;
  rightText: string;
  rightImage: string;
  rightVideo: string;
  quoteText: string;
  quoteAttribution: string;
  calloutTitle: string;
  calloutText: string;
  calloutVisibleIf: BuilderStateCondition[];
  emailFrom: string;
  emailSubject: string;
  emailPreviewText: string;
  emailWarningBanner: string;
  emailWarningBannerVisibleIf: BuilderStateCondition[];
  emailAttachments: string;
  chatTitle: string;
  chatSystemNotice: string;
  chatSystemNoticeVisibleIf: BuilderStateCondition[];
  chatMessages: BuilderChatMessage[];
  dashboardTitle: string;
  dashboardNotice: string;
  dashboardNoticeVisibleIf: BuilderStateCondition[];
  dashboardNavItems: string;
  dashboardCards: BuilderDashboardCard[];
  options: BuilderChoiceOption[];
  interactions: BuilderShellInteraction[];
}

export interface BuilderCourse {
  id: string;
  title: string;
  description: string;
  start: string;
  passingScore: string;
  stateVariables: BuilderScenarioStateVariable[];
  nodes: BuilderNode[];
}

function stringifyScalarValue(value: TemplateScalarValue): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeStateConditions(
  conditions: ScenarioStateCondition[] | null | undefined
): BuilderStateCondition[] {
  return (conditions ?? []).map((condition) => {
    if (condition.equals !== undefined) {
      return {
        variable: condition.variable,
        operator: "equals",
        value: stringifyScalarValue(condition.equals),
      };
    }

    if (condition.notEquals !== undefined) {
      return {
        variable: condition.variable,
        operator: "notEquals",
        value: stringifyScalarValue(condition.notEquals),
      };
    }

    if (condition.oneOf !== undefined) {
      return {
        variable: condition.variable,
        operator: "oneOf",
        value: condition.oneOf.map((entry) => stringifyScalarValue(entry)).join(", "),
      };
    }

    if (condition.gt !== undefined) {
      return {
        variable: condition.variable,
        operator: "gt",
        value: String(condition.gt),
      };
    }

    if (condition.gte !== undefined) {
      return {
        variable: condition.variable,
        operator: "gte",
        value: String(condition.gte),
      };
    }

    if (condition.lt !== undefined) {
      return {
        variable: condition.variable,
        operator: "lt",
        value: String(condition.lt),
      };
    }

    return {
      variable: condition.variable,
      operator: "lte",
      value: String(condition.lte ?? ""),
    };
  });
}

function normalizeStateRoutes(
  routes: ScenarioStateRoute[] | null | undefined
): BuilderStateRoute[] {
  return (routes ?? []).map((route) => ({
    next: route.next,
    conditions: normalizeStateConditions(route.when),
  }));
}

function normalizeStateUpdates(
  updates: ScenarioStateUpdate[] | null | undefined
): BuilderStateUpdate[] {
  return (updates ?? []).map((update) => {
    if (update.type === "set") {
      return {
        variable: update.variable,
        mode: "set",
        value: stringifyScalarValue(update.value as TemplateScalarValue),
      };
    }

    if (update.type === "increment") {
      return {
        variable: update.variable,
        mode: "increment",
        value: String(update.value),
      };
    }

    return {
      variable: update.variable,
      mode: "decrement",
      value: String(update.value ?? 0),
    };
  });
}

function normalizeStateVariables(
  course: CompiledCourse
): BuilderScenarioStateVariable[] {
  return course.scenarioStateOrder.map((key) => {
    const definition = course.scenarioState[key];

    return {
      id: key,
      type: definition.type,
      initial: stringifyScalarValue(definition.initialValue),
      description: definition.description ?? "",
      optionsText: definition.options?.join("\n") ?? "",
    };
  });
}

function normalizeMedia(media: CompiledMedia | null): Pick<
  BuilderNode,
  "mediaType" | "mediaSrc" | "mediaAlt" | "mediaCaption"
> {
  return {
    mediaType: media?.type ?? "image",
    mediaSrc: media?.src ?? "",
    mediaAlt: media?.alt ?? "",
    mediaCaption: media?.caption ?? "",
  };
}

function normalizeColumns(
  left: CompiledLayoutColumn | null,
  right: CompiledLayoutColumn | null
): Pick<
  BuilderNode,
  | "leftTitle"
  | "leftText"
  | "leftImage"
  | "leftVideo"
  | "rightTitle"
  | "rightText"
  | "rightImage"
  | "rightVideo"
> {
  return {
    leftTitle: left?.title ?? "",
    leftText: left?.text ?? "",
    leftImage: left?.image ?? "",
    leftVideo: left?.video ?? "",
    rightTitle: right?.title ?? "",
    rightText: right?.text ?? "",
    rightImage: right?.image ?? "",
    rightVideo: right?.video ?? "",
  };
}

function normalizeQuote(quote: CompiledQuoteBlock | null): Pick<
  BuilderNode,
  "quoteText" | "quoteAttribution"
> {
  return {
    quoteText: quote?.text ?? "",
    quoteAttribution: quote?.attribution ?? "",
  };
}

function normalizeCallout(callout: CompiledCalloutBlock | null): Pick<
  BuilderNode,
  "calloutTitle" | "calloutText" | "calloutVisibleIf"
> {
  return {
    calloutTitle: callout?.title ?? "",
    calloutText: callout?.text ?? "",
    calloutVisibleIf: normalizeStateConditions(callout?.visibleWhen),
  };
}

function normalizeEmailShell(shell: CompiledEmailShell | null): Pick<
  BuilderNode,
  | "emailFrom"
  | "emailSubject"
  | "emailPreviewText"
  | "emailWarningBanner"
  | "emailWarningBannerVisibleIf"
  | "emailAttachments"
> {
  return {
    emailFrom: shell?.from ?? "",
    emailSubject: shell?.subject ?? "",
    emailPreviewText: shell?.previewText ?? "",
    emailWarningBanner: shell?.warningBanner ?? "",
    emailWarningBannerVisibleIf: normalizeStateConditions(
      shell?.warningBannerVisibleWhen
    ),
    emailAttachments: shell?.attachments.join("\n") ?? "",
  };
}

function normalizeChatShell(shell: CompiledChatShell | null): Pick<
  BuilderNode,
  "chatTitle" | "chatSystemNotice" | "chatSystemNoticeVisibleIf" | "chatMessages"
> {
  return {
    chatTitle: shell?.title ?? "",
    chatSystemNotice: shell?.systemNotice ?? "",
    chatSystemNoticeVisibleIf: normalizeStateConditions(
      shell?.systemNoticeVisibleWhen
    ),
    chatMessages:
      shell?.messages.map((message) => ({
        sender: message.sender,
        text: message.text,
        timestamp: message.timestamp,
        role: message.role,
        visibleIf: normalizeStateConditions(message.visibleWhen),
      })) ?? [],
  };
}

function normalizeDashboardShell(shell: CompiledDashboardShell | null): Pick<
  BuilderNode,
  | "dashboardTitle"
  | "dashboardNotice"
  | "dashboardNoticeVisibleIf"
  | "dashboardNavItems"
  | "dashboardCards"
> {
  return {
    dashboardTitle: shell?.title ?? "",
    dashboardNotice: shell?.notice ?? "",
    dashboardNoticeVisibleIf: normalizeStateConditions(shell?.noticeVisibleWhen),
    dashboardNavItems: shell?.navItems.join("\n") ?? "",
    dashboardCards:
      shell?.cards.map((card) => ({
        title: card.title,
        text: card.text,
        metricLabel: card.metricLabel,
        metricValue: card.metricValue,
        status: card.status,
        visibleIf: normalizeStateConditions(card.visibleWhen),
      })) ?? [],
  };
}

function normalizeShellInteractions(
  node: CompiledNode
): Pick<BuilderNode, "interactions"> {
  return {
    interactions: node.interactions.map((interaction) => {
      switch (interaction.type) {
        case "email_link":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: interaction.label,
            title: "",
            text: "",
            hrefLabel: interaction.hrefLabel,
            fileName: "",
            variant: "primary",
            status: "neutral",
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "email_attachment":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: interaction.label,
            title: "",
            text: "",
            hrefLabel: "",
            fileName: interaction.fileName,
            variant: "primary",
            status: "neutral",
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "email_action_button":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: interaction.label,
            title: "",
            text: "",
            hrefLabel: "",
            fileName: "",
            variant: interaction.variant,
            status: "neutral",
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "chat_reply_option":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: interaction.label,
            title: "",
            text: "",
            hrefLabel: "",
            fileName: "",
            variant: "primary",
            status: "neutral",
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "chat_choice_message":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: "",
            title: "",
            text: interaction.text,
            hrefLabel: "",
            fileName: "",
            variant: "primary",
            status: "neutral",
            sender: interaction.sender,
            timestamp: interaction.timestamp,
            role: interaction.role,
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "dashboard_action_card":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: "",
            title: interaction.title,
            text: interaction.text,
            hrefLabel: "",
            fileName: "",
            variant: "primary",
            status: interaction.status,
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "dashboard_flag_toggle":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: interaction.label,
            title: "",
            text: "",
            hrefLabel: "",
            fileName: "",
            variant: "primary",
            status: interaction.status,
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
        case "dashboard_review_item":
          return {
            id: interaction.id,
            type: interaction.type,
            optionId: interaction.optionId,
            label: "",
            title: interaction.title,
            text: interaction.text,
            hrefLabel: "",
            fileName: "",
            variant: "primary",
            status: interaction.status,
            sender: "",
            timestamp: "",
            role: "other",
            feedback: interaction.feedback,
            visibleIf: normalizeStateConditions(interaction.visibleWhen),
          };
      }
    }),
  };
}

function inferDefaultLayout(node: CompiledNode): CourseLayoutType {
  if (node.layout) {
    return node.layout;
  }

  switch (node.type) {
    case "quiz":
      return "question";
    case "result":
      return "result";
    default:
      return "text";
  }
}

function compiledNodeToBuilderNode(node: CompiledNode): BuilderNode {
  const columnFields = normalizeColumns(node.left, node.right);

  return {
    id: node.id,
    type:
      node.type === "quiz"
        ? node.sourceType === "question"
          ? "question"
          : "question"
        : node.type === "choice"
          ? node.sourceType === "branch"
            ? "branch"
            : "choice"
          : node.type,
    title: node.title,
    body: node.body,
    layout: inferDefaultLayout(node),
    shell: node.shell ?? "card",
    next: node.type === "content" ? node.next ?? "" : "",
    nextWhen:
      node.type === "content" ? normalizeStateRoutes(node.nextWhen) : [],
    prompt: node.type === "quiz" ? node.question : "",
    multiple: node.type === "quiz" ? node.multiple : false,
    correctScore: node.type === "quiz" ? String(node.correctScore) : "10",
    incorrectScore: node.type === "quiz" ? String(node.incorrectScore) : "0",
    passNext: node.type === "quiz" ? node.passNext ?? "" : "",
    passNextWhen:
      node.type === "quiz" ? normalizeStateRoutes(node.passNextWhen) : [],
    failNext: node.type === "quiz" ? node.failNext ?? "" : "",
    failNextWhen:
      node.type === "quiz" ? normalizeStateRoutes(node.failNextWhen) : [],
    outcome: node.type === "result" ? node.outcome : "neutral",
    ...normalizeMedia(node.media),
    ...columnFields,
    ...normalizeQuote(node.quote),
    ...normalizeCallout(node.callout),
    ...normalizeEmailShell(node.emailShell),
    ...normalizeChatShell(node.chatShell),
    ...normalizeDashboardShell(node.dashboardShell),
    ...normalizeShellInteractions(node),
    options:
      node.type === "choice"
        ? node.options.map((option) => ({
            id: option.id,
            label: option.label,
            next: option.next,
            score: String(option.score),
            correct: false,
            stateUpdates: normalizeStateUpdates(option.stateUpdates),
            nextWhen: normalizeStateRoutes(option.nextWhen),
          }))
        : node.type === "quiz"
          ? node.options.map((option) => ({
              id: option.id,
              label: option.label,
              next: "",
              score: "0",
              correct: option.correct,
              stateUpdates: normalizeStateUpdates(option.stateUpdates),
              nextWhen: [],
            }))
          : [],
  };
}

function findStateVariableType(
  definitions: BuilderScenarioStateVariable[],
  key: string
): ScenarioStateVariableDocument["type"] | null {
  return definitions.find((definition) => definition.id === key)?.type ?? null;
}

function coerceBuilderScalarValue(
  value: string,
  type: ScenarioStateVariableDocument["type"] | null
): TemplateScalarValue {
  if (type === "boolean") {
    return value === "true";
  }

  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
}

function toStateConditionDocuments(
  conditions: BuilderStateCondition[],
  definitions: BuilderScenarioStateVariable[]
): ScenarioStateConditionDocument[] | undefined {
  const nextConditions = conditions
    .map((condition) => {
      const valueType = findStateVariableType(definitions, condition.variable);
      const rawValue = condition.value.trim();

      switch (condition.operator) {
        case "equals":
          return {
            variable: condition.variable,
            equals: coerceBuilderScalarValue(rawValue, valueType),
          };
        case "notEquals":
          return {
            variable: condition.variable,
            notEquals: coerceBuilderScalarValue(rawValue, valueType),
          };
        case "oneOf":
          return {
            variable: condition.variable,
            oneOf: rawValue
              .split(/[\r\n,]+/)
              .map((entry) => entry.trim())
              .filter(Boolean)
              .map((entry) => coerceBuilderScalarValue(entry, valueType)),
          };
        case "gt":
          return {
            variable: condition.variable,
            gt: Number(rawValue || "0"),
          };
        case "gte":
          return {
            variable: condition.variable,
            gte: Number(rawValue || "0"),
          };
        case "lt":
          return {
            variable: condition.variable,
            lt: Number(rawValue || "0"),
          };
        case "lte":
          return {
            variable: condition.variable,
            lte: Number(rawValue || "0"),
          };
      }
    })
    .filter((condition) => condition.variable);

  return nextConditions.length > 0 ? nextConditions : undefined;
}

function toStateRouteDocuments(
  routes: BuilderStateRoute[],
  definitions: BuilderScenarioStateVariable[]
): ScenarioStateRouteDocument[] | undefined {
  const nextRoutes = routes
    .map((route) => ({
      next: route.next.trim(),
      when: toStateConditionDocuments(route.conditions, definitions) ?? [],
    }))
    .filter((route) => route.next && route.when.length > 0);

  return nextRoutes.length > 0 ? nextRoutes : undefined;
}

function toStateUpdateDocuments(
  updates: BuilderStateUpdate[],
  definitions: BuilderScenarioStateVariable[]
): ScenarioStateUpdateDocument[] | undefined {
  const nextUpdates = updates
    .map((update) => {
      const valueType = findStateVariableType(definitions, update.variable);
      const rawValue = update.value.trim();

      switch (update.mode) {
        case "set":
          return {
            variable: update.variable,
            set: coerceBuilderScalarValue(rawValue, valueType),
          };
        case "increment":
          return {
            variable: update.variable,
            increment: Number(rawValue || "0"),
          };
        case "decrement":
          return {
            variable: update.variable,
            decrement: Number(rawValue || "0"),
          };
      }
    })
    .filter((update) => update.variable);

  return nextUpdates.length > 0 ? nextUpdates : undefined;
}

function toScenarioStateVariableDocuments(
  definitions: BuilderScenarioStateVariable[]
): Record<string, ScenarioStateVariableDocument> | undefined {
  const nextEntries = (definitions ?? [])
    .map((definition) => [
      definition.id.trim(),
      {
        type: definition.type,
        initial: coerceBuilderScalarValue(definition.initial.trim(), definition.type),
        description: definition.description.trim() || undefined,
        options:
          definition.type === "enum"
            ? definition.optionsText
                .split(/[\r\n,]+/)
                .map((entry) => entry.trim())
                .filter(Boolean)
            : undefined,
      } satisfies ScenarioStateVariableDocument,
    ] as const)
    .filter(([key]) => key);

  return nextEntries.length > 0
    ? Object.fromEntries(nextEntries)
    : undefined;
}

function toShellInteractionDocuments(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
): ShellInteractionDocument[] | undefined {
  if (node.interactions.length === 0) {
    return undefined;
  }

  return node.interactions.map((interaction) => {
    switch (interaction.type) {
      case "email_link":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          label: interaction.label.trim(),
          hrefLabel: interaction.hrefLabel.trim() || undefined,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "email_attachment":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          label: interaction.label.trim(),
          fileName: interaction.fileName.trim() || undefined,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "email_action_button":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          label: interaction.label.trim(),
          variant: interaction.variant,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "chat_reply_option":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          label: interaction.label.trim(),
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "chat_choice_message":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          sender: interaction.sender.trim(),
          text: interaction.text.trim(),
          timestamp: interaction.timestamp.trim() || undefined,
          role: interaction.role,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "dashboard_action_card":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          title: interaction.title.trim(),
          text: interaction.text.trim() || undefined,
          status: interaction.status,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "dashboard_flag_toggle":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          label: interaction.label.trim(),
          status: interaction.status,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
      case "dashboard_review_item":
        return {
          id: interaction.id,
          type: interaction.type,
          optionId: interaction.optionId,
          title: interaction.title.trim(),
          text: interaction.text.trim() || undefined,
          status: interaction.status,
          feedback: interaction.feedback.trim() || undefined,
          visibleIf: toStateConditionDocuments(interaction.visibleIf, definitions),
        };
    }
  });
}

function toMediaDocument(node: BuilderNode): MediaDocument | undefined {
  if (!node.mediaSrc.trim()) {
    return undefined;
  }

  return {
    type: node.mediaType,
    src: node.mediaSrc.trim(),
    alt: node.mediaAlt.trim() || undefined,
    caption: node.mediaCaption.trim() || undefined,
  };
}

function toColumnDocument(
  title: string,
  text: string,
  image: string,
  video: string
): LayoutColumnDocument | undefined {
  const nextColumn: LayoutColumnDocument = {};

  if (title.trim()) {
    nextColumn.title = title.trim();
  }

  if (text.trim()) {
    nextColumn.text = text.trim();
  }

  if (image.trim()) {
    nextColumn.image = image.trim();
  }

  if (video.trim()) {
    nextColumn.video = video.trim();
  }

  return Object.keys(nextColumn).length > 0 ? nextColumn : undefined;
}

function toQuoteDocument(node: BuilderNode): QuoteBlockDocument | undefined {
  if (!node.quoteText.trim()) {
    return undefined;
  }

  return {
    text: node.quoteText.trim(),
    attribution: node.quoteAttribution.trim() || undefined,
  };
}

function toCalloutDocument(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
): CalloutBlockDocument | undefined {
  if (!node.calloutText.trim()) {
    return undefined;
  }

  return {
    title: node.calloutTitle.trim() || undefined,
    text: node.calloutText.trim(),
    visibleIf: toStateConditionDocuments(node.calloutVisibleIf, definitions),
  };
}

function toEmailShellDocument(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
): EmailShellDocument | undefined {
  if (!node.emailFrom.trim() && !node.emailSubject.trim() && !node.emailPreviewText.trim() && !node.emailWarningBanner.trim() && !node.emailAttachments.trim()) {
    return undefined;
  }

  return {
    from: node.emailFrom.trim(),
    subject: node.emailSubject.trim(),
    previewText: node.emailPreviewText.trim() || undefined,
    warningBanner: node.emailWarningBanner.trim() || undefined,
    warningBannerVisibleIf: toStateConditionDocuments(
      node.emailWarningBannerVisibleIf,
      definitions
    ),
    attachments: node.emailAttachments
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function toChatShellDocument(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
): ChatShellDocument | undefined {
  if (!node.chatTitle.trim() && !node.chatSystemNotice.trim() && node.chatMessages.length === 0) {
    return undefined;
  }

  return {
    title: node.chatTitle.trim() || undefined,
    systemNotice: node.chatSystemNotice.trim() || undefined,
    messages: node.chatMessages
      .map((message) => ({
        sender: message.sender.trim(),
        text: message.text.trim(),
        timestamp: message.timestamp.trim() || undefined,
        role: message.role,
        visibleIf: toStateConditionDocuments(message.visibleIf, definitions),
      }))
      .filter((message) => message.sender && message.text),
  };
}

function toDashboardShellDocument(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
): DashboardShellDocument | undefined {
  if (!node.dashboardTitle.trim() && !node.dashboardNotice.trim() && !node.dashboardNavItems.trim() && node.dashboardCards.length === 0) {
    return undefined;
  }

  return {
    title: node.dashboardTitle.trim() || undefined,
    notice: node.dashboardNotice.trim() || undefined,
    noticeVisibleIf: toStateConditionDocuments(
      node.dashboardNoticeVisibleIf,
      definitions
    ),
    navItems: node.dashboardNavItems
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    cards: node.dashboardCards
      .map((card) => ({
        title: card.title.trim(),
        text: card.text.trim() || undefined,
        metricLabel: card.metricLabel.trim() || undefined,
        metricValue: card.metricValue.trim() || undefined,
        status: card.status,
        visibleIf: toStateConditionDocuments(card.visibleIf, definitions),
      }))
      .filter((card) => card.title),
  };
}

function hasExplicitShellContent(node: BuilderNode): boolean {
  switch (node.shell) {
    case "email_shell":
      return Boolean(
        node.emailFrom.trim() ||
          node.emailSubject.trim() ||
          node.emailPreviewText.trim() ||
          node.emailWarningBanner.trim() ||
          node.emailAttachments.trim()
      );
    case "chat_shell":
      return Boolean(
        node.chatTitle.trim() ||
          node.chatSystemNotice.trim() ||
          node.chatMessages.length > 0
      );
    case "dashboard_shell":
      return Boolean(
        node.dashboardTitle.trim() ||
          node.dashboardNotice.trim() ||
          node.dashboardNavItems.trim() ||
          node.dashboardCards.length > 0
      );
    default:
      return false;
  }
}

function withPresentation(
  node: BuilderNode,
  definitions: BuilderScenarioStateVariable[]
) {
  return {
    layout: node.layout,
    shell: node.shell !== "card" || hasExplicitShellContent(node) ? node.shell : undefined,
    media: toMediaDocument(node),
    left: toColumnDocument(
      node.leftTitle,
      node.leftText,
      node.leftImage,
      node.leftVideo
    ),
    right: toColumnDocument(
      node.rightTitle,
      node.rightText,
      node.rightImage,
      node.rightVideo
    ),
    quote: toQuoteDocument(node),
    callout: toCalloutDocument(node, definitions),
    email:
      node.shell === "email_shell"
        ? toEmailShellDocument(node, definitions)
        : undefined,
    chat:
      node.shell === "chat_shell"
        ? toChatShellDocument(node, definitions)
        : undefined,
    dashboard:
      node.shell === "dashboard_shell"
        ? toDashboardShellDocument(node, definitions)
        : undefined,
    interactions: toShellInteractionDocuments(node, definitions),
  };
}

export function compiledCourseToBuilderCourse(course: CompiledCourse): BuilderCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    start: course.startNodeId,
    passingScore: String(course.passingScore),
    stateVariables: normalizeStateVariables(course),
    nodes: course.nodeOrder.map((nodeId) =>
      compiledNodeToBuilderNode(course.nodes[nodeId])
    ),
  };
}

export function createEmptyBuilderNode(
  index: number,
  type: BuilderNode["type"] = "content"
): BuilderNode {
  return {
    id: `step-${index + 1}`,
    type,
    title: type === "result" ? "Result" : "New step",
    body: "",
    layout:
      type === "result"
        ? "result"
        : type === "question"
          ? "question"
          : "text",
    shell: "card",
    next: "",
    nextWhen: [],
    prompt: "",
    multiple: false,
    correctScore: "10",
    incorrectScore: "0",
    passNext: "",
    passNextWhen: [],
    failNext: "",
    failNextWhen: [],
    outcome: "neutral",
    mediaType: "image",
    mediaSrc: "",
    mediaAlt: "",
    mediaCaption: "",
    leftTitle: "",
    leftText: "",
    leftImage: "",
    leftVideo: "",
    rightTitle: "",
    rightText: "",
    rightImage: "",
    rightVideo: "",
    quoteText: "",
    quoteAttribution: "",
    calloutTitle: "",
    calloutText: "",
    calloutVisibleIf: [],
    emailFrom: "",
    emailSubject: "",
    emailPreviewText: "",
    emailWarningBanner: "",
    emailWarningBannerVisibleIf: [],
    emailAttachments: "",
    chatTitle: "",
    chatSystemNotice: "",
    chatSystemNoticeVisibleIf: [],
    chatMessages: [],
    dashboardTitle: "",
    dashboardNotice: "",
    dashboardNoticeVisibleIf: [],
    dashboardNavItems: "",
    dashboardCards: [],
    interactions: [],
    options:
      type === "choice" || type === "branch"
        ? [
            {
              id: "option-a",
              label: "First path",
              next: "",
              score: "0",
              correct: false,
              stateUpdates: [],
              nextWhen: [],
            },
            {
              id: "option-b",
              label: "Second path",
              next: "",
              score: "0",
              correct: false,
              stateUpdates: [],
              nextWhen: [],
            },
          ]
        : type === "question"
          ? [
              {
                id: "correct",
                label: "Correct answer",
                next: "",
                score: "0",
                correct: true,
                stateUpdates: [],
                nextWhen: [],
              },
              {
                id: "incorrect",
                label: "Distractor",
                next: "",
                score: "0",
                correct: false,
                stateUpdates: [],
                nextWhen: [],
              },
            ]
          : [],
  };
}

export function createEmptyBuilderCourse(): BuilderCourse {
  const introNode = createEmptyBuilderNode(0, "content");
  introNode.id = "intro";
  introNode.title = "Welcome";
  introNode.body = "Introduce the learner to the scenario.";
  introNode.next = "result";

  const resultNode = createEmptyBuilderNode(1, "result");
  resultNode.id = "result";
  resultNode.title = "Complete";
  resultNode.outcome = "neutral";
  resultNode.body = "Course complete.";

  return {
    id: "new-training-course",
    title: "New Training Course",
    description: "Describe the training scenario.",
    start: "intro",
    passingScore: "0",
    stateVariables: [],
    nodes: [introNode, resultNode],
  };
}

export function builderCourseToTemplateDocument(
  builderCourse: BuilderCourse,
  templateData: Record<string, TemplateScalarValue> = {}
): CourseTemplateDocument {
  const stateVariables = builderCourse.stateVariables ?? [];

  return {
    id: builderCourse.id,
    title: builderCourse.title,
    description: builderCourse.description,
    start: builderCourse.start,
    passingScore: builderCourse.passingScore,
    templateData,
    state: toScenarioStateVariableDocuments(stateVariables),
    nodes: builderCourse.nodes.map((node) => {
      const baseNode = {
        id: node.id,
        title: node.title,
        body: node.body || undefined,
        ...withPresentation(node, stateVariables),
      };

      switch (node.type) {
        case "content":
          return {
            ...baseNode,
            type: "content" as const,
            next: node.next.trim() || undefined,
            nextWhen: toStateRouteDocuments(node.nextWhen, stateVariables),
          };
        case "choice":
        case "branch":
          return {
            ...baseNode,
            type: node.type,
            options: node.options.map((option) => ({
              id: option.id,
              label: option.label,
              next: option.next,
              score: option.score,
              stateUpdates: toStateUpdateDocuments(
                option.stateUpdates,
                stateVariables
              ),
              nextWhen: toStateRouteDocuments(option.nextWhen, stateVariables),
            })),
          };
        case "question":
          return {
            ...baseNode,
            type: "question" as const,
            prompt: node.prompt,
            multiple: node.multiple,
            options: node.options.map((option) => ({
              id: option.id,
              label: option.label,
              correct: option.correct,
              stateUpdates: toStateUpdateDocuments(
                option.stateUpdates,
                stateVariables
              ),
            })),
            correctScore: node.correctScore,
            incorrectScore: node.incorrectScore,
            passNext: node.passNext.trim() || undefined,
            passNextWhen: toStateRouteDocuments(
              node.passNextWhen,
              stateVariables
            ),
            failNext: node.failNext.trim() || undefined,
            failNextWhen: toStateRouteDocuments(
              node.failNextWhen,
              stateVariables
            ),
            next: node.next.trim() || undefined,
            nextWhen: toStateRouteDocuments(node.nextWhen, stateVariables),
          };
        case "result":
          return {
            ...baseNode,
            type: "result" as const,
            outcome: node.outcome,
          };
      }
    }),
  };
}

export function builderCourseToYaml(
  builderCourse: BuilderCourse,
  templateData: Record<string, TemplateScalarValue> = {}
): string {
  return yaml.dump(builderCourseToTemplateDocument(builderCourse, templateData), {
    noRefs: true,
    lineWidth: -1,
    sortKeys: false,
  });
}
