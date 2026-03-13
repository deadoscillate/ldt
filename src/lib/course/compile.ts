import type {
  ChatShellDocument,
  BranchNodeDocument,
  ChoiceNodeDocument,
  ContentNodeDocument,
  CourseDocument,
  CourseDocumentNode,
  DashboardShellDocument,
  EmailShellDocument,
  ScenarioStateConditionDocument,
  ScenarioStateRouteDocument,
  ScenarioStateUpdateDocument,
  ScenarioStateVariableDocument,
  ShellInteractionDocument,
  QuestionNodeDocument,
  QuizNodeDocument,
  ResultNodeDocument,
  ThemeDocument,
} from "@/lib/course/schema";
import type {
  CanonicalCourse,
  CanonicalNode,
  CompiledCalloutBlock,
  CompiledChatShell,
  CompiledDashboardShell,
  CompiledChoiceNode,
  CompiledEdge,
  CompiledEmailShell,
  CompiledLayoutColumn,
  CompiledMedia,
  CompiledQuoteBlock,
  CompiledQuizNode,
  CompiledShellInteraction,
  CompiledTheme,
  ScenarioStateCondition,
  ScenarioStateRoute,
  ScenarioStateUpdate,
  ScenarioStateVariableDefinition,
  ShellInteractionType,
} from "@/lib/course/types";
import { COURSE_LAYOUT_TYPES } from "@/lib/course/types";
import { createSceneForNode, validateNodeScene } from "@/lib/course/scenes";

export class CourseCompilationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Course compilation failed.");
    this.name = "CourseCompilationError";
    this.issues = issues;
  }
}

function sourceNodeMaxScore(node: CourseDocumentNode): number {
  switch (node.type) {
    case "choice":
    case "branch":
      return Math.max(0, ...node.options.map((option) => option.score ?? 0));
    case "quiz":
    case "question":
      return Math.max(0, node.correctScore ?? 0);
    default:
      return 0;
  }
}

function normalizeScenarioStateConditions(
  conditions: ScenarioStateConditionDocument[] | undefined
): ScenarioStateCondition[] | null {
  if (!conditions || conditions.length === 0) {
    return null;
  }

  return conditions.map((condition) => ({
    variable: condition.variable,
    equals: condition.equals,
    notEquals: condition.notEquals,
    oneOf: condition.oneOf,
    gt: condition.gt,
    gte: condition.gte,
    lt: condition.lt,
    lte: condition.lte,
  }));
}

function normalizeScenarioStateRoutes(
  routes: ScenarioStateRouteDocument[] | undefined
): ScenarioStateRoute[] {
  if (!routes) {
    return [];
  }

  return routes.map((route) => ({
    when: normalizeScenarioStateConditions(route.when) ?? [],
    next: route.next,
  }));
}

function normalizeScenarioStateUpdates(
  updates: ScenarioStateUpdateDocument[] | undefined
): ScenarioStateUpdate[] {
  if (!updates) {
    return [];
  }

  return updates.map((update) => {
    if (update.set !== undefined) {
      return {
        variable: update.variable,
        type: "set",
        value: update.set,
      };
    }

    if (update.increment !== undefined) {
      return {
        variable: update.variable,
        type: "increment",
        value: update.increment,
      };
    }

    return {
      variable: update.variable,
      type: "decrement",
      value: update.decrement ?? 0,
    };
  });
}

function normalizeScenarioStateDefinitions(
  values: Record<string, ScenarioStateVariableDocument> | undefined
): {
  definitions: Record<string, ScenarioStateVariableDefinition>;
  order: string[];
} {
  const order = Object.keys(values ?? {});

  return {
    order,
    definitions: Object.fromEntries(
      order.map((id) => {
        const definition = values?.[id];

        return [
          id,
          {
            id,
            type: definition?.type ?? "string",
            initialValue: definition?.initial ?? "",
            description: definition?.description ?? "",
            options: definition?.options ?? [],
          },
        ];
      })
    ),
  };
}

function normalizeMedia(node: CourseDocumentNode): CompiledMedia | null {
  if (!node.media) {
    return null;
  }

  return {
    type: node.media.type,
    src: node.media.src,
    alt: node.media.alt ?? "",
    caption: node.media.caption ?? "",
  };
}

function normalizeColumn(
  column: CourseDocumentNode["left"] | CourseDocumentNode["right"]
): CompiledLayoutColumn | null {
  if (!column) {
    return null;
  }

  return {
    title: column.title ?? "",
    text: column.text ?? "",
    image: column.image ?? null,
    video: column.video ?? null,
  };
}

function normalizeQuote(node: CourseDocumentNode): CompiledQuoteBlock | null {
  if (!node.quote) {
    return null;
  }

  return {
    text: node.quote.text,
    attribution: node.quote.attribution ?? "",
  };
}

function normalizeCallout(node: CourseDocumentNode): CompiledCalloutBlock | null {
  if (!node.callout) {
    return null;
  }

  return {
    title: node.callout.title ?? "",
    text: node.callout.text,
    visibleWhen: normalizeScenarioStateConditions(node.callout.visibleIf),
  };
}

function normalizeEmailShell(value: EmailShellDocument | undefined): CompiledEmailShell | null {
  if (!value) {
    return null;
  }

  return {
    from: value.from,
    subject: value.subject,
    previewText: value.previewText ?? "",
    attachments: value.attachments ?? [],
    warningBanner: value.warningBanner ?? "",
    warningBannerVisibleWhen: normalizeScenarioStateConditions(
      value.warningBannerVisibleIf
    ),
  };
}

function normalizeChatShell(value: ChatShellDocument | undefined): CompiledChatShell | null {
  if (!value) {
    return null;
  }

  return {
    title: value.title ?? "",
    systemNotice: value.systemNotice ?? "",
    systemNoticeVisibleWhen: normalizeScenarioStateConditions(
      value.systemNoticeVisibleIf
    ),
    messages: value.messages.map((message) => ({
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp ?? "",
      role: message.role ?? "other",
      visibleWhen: normalizeScenarioStateConditions(message.visibleIf),
    })),
  };
}

function normalizeDashboardShell(
  value: DashboardShellDocument | undefined
): CompiledDashboardShell | null {
  if (!value) {
    return null;
  }

  return {
    title: value.title ?? "",
    navItems: value.navItems ?? [],
    notice: value.notice ?? "",
    noticeVisibleWhen: normalizeScenarioStateConditions(value.noticeVisibleIf),
    cards: (value.cards ?? []).map((card) => ({
      title: card.title,
      text: card.text ?? "",
      metricLabel: card.metricLabel ?? "",
      metricValue: card.metricValue ?? "",
      status: card.status ?? "neutral",
      visibleWhen: normalizeScenarioStateConditions(card.visibleIf),
    })),
  };
}

function normalizeShellInteractions(
  value: ShellInteractionDocument[] | undefined
): CompiledShellInteraction[] {
  if (!value) {
    return [];
  }

  return value.map((interaction) => {
    switch (interaction.type) {
      case "email_link":
        return {
          type: "email_link" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          label: interaction.label,
          hrefLabel: interaction.hrefLabel ?? "",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "email_attachment":
        return {
          type: "email_attachment" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          label: interaction.label,
          fileName: interaction.fileName ?? "",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "email_action_button":
        return {
          type: "email_action_button" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          label: interaction.label,
          variant: interaction.variant ?? "primary",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "chat_reply_option":
        return {
          type: "chat_reply_option" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          label: interaction.label,
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "chat_choice_message":
        return {
          type: "chat_choice_message" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          sender: interaction.sender,
          text: interaction.text,
          timestamp: interaction.timestamp ?? "",
          role: interaction.role ?? "other",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "dashboard_action_card":
        return {
          type: "dashboard_action_card" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          title: interaction.title,
          text: interaction.text ?? "",
          status: interaction.status ?? "neutral",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "dashboard_flag_toggle":
        return {
          type: "dashboard_flag_toggle" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          label: interaction.label,
          status: interaction.status ?? "neutral",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
      case "dashboard_review_item":
        return {
          type: "dashboard_review_item" as const,
          id: interaction.id,
          optionId: interaction.optionId,
          title: interaction.title,
          text: interaction.text ?? "",
          status: interaction.status ?? "neutral",
          feedback: interaction.feedback ?? "",
          visibleWhen: normalizeScenarioStateConditions(interaction.visibleIf),
        };
    }
  });
}

function allowedInteractionTypesForShell(shell: CanonicalNode["shell"]): ReadonlySet<ShellInteractionType> | null {
  switch (shell) {
    case "email_shell":
      return new Set(["email_link", "email_attachment", "email_action_button"]);
    case "chat_shell":
      return new Set(["chat_reply_option", "chat_choice_message"]);
    case "dashboard_shell":
      return new Set([
        "dashboard_action_card",
        "dashboard_flag_toggle",
        "dashboard_review_item",
      ]);
    default:
      return null;
  }
}

function createBaseNode(node: CourseDocumentNode) {
  return {
    id: node.id,
    title: node.title,
    body: node.body ?? "",
    layout: node.layout ?? null,
    shell: node.shell ?? null,
    media: normalizeMedia(node),
    left: normalizeColumn(node.left),
    right: normalizeColumn(node.right),
    quote: normalizeQuote(node),
    callout: normalizeCallout(node),
    emailShell: normalizeEmailShell(node.email),
    chatShell: normalizeChatShell(node.chat),
    dashboardShell: normalizeDashboardShell(node.dashboard),
    interactions: normalizeShellInteractions(node.interactions),
  };
}

function withScene<T extends ReturnType<typeof createBaseNode> & {
  id: string;
  type: CanonicalNode["type"];
  sourceType: CanonicalNode["sourceType"];
}>(node: T): T & Pick<CanonicalNode, "scene"> {
  return {
    ...node,
    scene: createSceneForNode(node as unknown as CanonicalNode),
  };
}

function normalizeContentNode(node: ContentNodeDocument): CanonicalNode {
  return withScene({
    ...createBaseNode(node),
    type: "content",
    sourceType: "content",
    next: node.next ?? null,
    nextWhen: normalizeScenarioStateRoutes(node.nextWhen),
  });
}

function normalizeChoiceLikeNode(
  node: ChoiceNodeDocument | BranchNodeDocument
): CanonicalNode {
  return withScene({
    ...createBaseNode(node),
    type: "choice",
    sourceType: node.type,
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      next: option.next,
      nextWhen: normalizeScenarioStateRoutes(option.nextWhen),
      score: option.score ?? 0,
      feedback: option.feedback ?? "",
      stateUpdates: normalizeScenarioStateUpdates(option.stateUpdates),
    })),
  });
}

function normalizeQuizLikeNode(
  node: QuizNodeDocument | QuestionNodeDocument
): CompiledQuizNode {
  return withScene({
    ...createBaseNode(node),
    type: "quiz",
    sourceType: node.type,
    question: node.type === "question" ? node.prompt : node.question,
    multiple: node.multiple ?? false,
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      correct: option.correct,
      feedback: option.feedback ?? "",
      stateUpdates: normalizeScenarioStateUpdates(option.stateUpdates),
    })),
    correctScore: node.correctScore ?? 10,
    incorrectScore: node.incorrectScore ?? 0,
    passNext: node.passNext ?? null,
    passNextWhen: normalizeScenarioStateRoutes(node.passNextWhen),
    failNext: node.failNext ?? null,
    failNextWhen: normalizeScenarioStateRoutes(node.failNextWhen),
    next: node.next ?? null,
    nextWhen: normalizeScenarioStateRoutes(node.nextWhen),
  });
}

function normalizeResultNode(node: ResultNodeDocument): CanonicalNode {
  return withScene({
    ...createBaseNode(node),
    type: "result",
    sourceType: "result",
    outcome: node.outcome ?? "neutral",
  });
}

function normalizeNode(node: CourseDocumentNode): CanonicalNode {
  switch (node.type) {
    case "content":
      return normalizeContentNode(node);
    case "choice":
    case "branch":
      return normalizeChoiceLikeNode(node);
    case "quiz":
    case "question":
      return normalizeQuizLikeNode(node);
    case "result":
      return normalizeResultNode(node);
  }
}

function normalizeTheme(theme: ThemeDocument | undefined): CompiledTheme {
  return {
    id: null,
    name: null,
    description: null,
    author: null,
    version: null,
    runtimeCompatibility: null,
    supportedLayouts: [...COURSE_LAYOUT_TYPES],
    primary: theme?.primary ?? null,
    secondary: theme?.secondary ?? null,
    font: theme?.font ?? null,
    headingFont: null,
    baseSize: null,
    headingScale: null,
    logo: theme?.logo ?? null,
    background: theme?.background ?? null,
    accent: null,
    surface: null,
    surfaceStrong: null,
    text: null,
    mutedText: null,
    border: null,
    success: null,
    danger: null,
    panelPadding: null,
    sectionGap: null,
    cardGap: null,
    buttonRadius: null,
    cardRadius: null,
    borderStyle: null,
    fontFaces: [],
  };
}

function pushEdge(
  edges: CompiledEdge[],
  issues: string[],
  nodeIds: Set<string>,
  from: string,
  to: string | null,
  label: string
): void {
  if (!to) {
    return;
  }

  if (!nodeIds.has(to)) {
    issues.push(`Node "${from}" references missing node "${to}" via "${label}".`);
    return;
  }

  edges.push({ from, to, label });
}

function validateLayoutConfiguration(node: CanonicalNode, issues: string[]): void {
  switch (node.layout) {
    case "image":
    case "video":
      if (!node.media) {
        issues.push(
          `Node "${node.id}" uses layout "${node.layout}" but does not define media.`
        );
      }
      break;
    case "two-column":
    case "image-left":
    case "image-right":
      if (!node.left && !node.right && !node.media) {
        issues.push(
          `Node "${node.id}" uses layout "${node.layout}" but does not define left/right column content.`
        );
      }
      break;
    case "quote":
      if (!node.quote) {
        issues.push(`Node "${node.id}" uses layout "quote" but does not define quote text.`);
      }
      break;
    case "callout":
      if (!node.callout) {
        issues.push(
          `Node "${node.id}" uses layout "callout" but does not define callout content.`
        );
      }
      break;
    case "question":
      if (node.type !== "quiz") {
        issues.push(
          `Node "${node.id}" uses layout "question" but is not a question node.`
        );
      }
      break;
    case "result":
      if (node.type !== "result") {
        issues.push(`Node "${node.id}" uses layout "result" but is not a result node.`);
      }
      break;
    default:
      break;
  }
}

function validateScenarioStateValue(
  definition: ScenarioStateVariableDefinition,
  value: unknown,
  path: string,
  issues: string[]
): void {
  switch (definition.type) {
    case "boolean":
      if (typeof value !== "boolean") {
        issues.push(`${path} must be a boolean because "${definition.id}" is boolean state.`);
      }
      return;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push(`${path} must be a finite number because "${definition.id}" is numeric state.`);
      }
      return;
    case "string":
      if (typeof value !== "string") {
        issues.push(`${path} must be a string because "${definition.id}" is string state.`);
      }
      return;
    case "enum":
      if (typeof value !== "string") {
        issues.push(`${path} must be a string because "${definition.id}" is enum state.`);
        return;
      }
      if (!definition.options.includes(value)) {
        issues.push(
          `${path} must be one of ${definition.options
            .map((option) => `"${option}"`)
            .join(", ")} for enum state "${definition.id}".`
        );
      }
      return;
  }
}

function validateScenarioStateConditions(
  conditions: ScenarioStateCondition[] | null | undefined,
  course: CanonicalCourse,
  path: string,
  issues: string[]
): void {
  (conditions ?? []).forEach((condition, index) => {
    const definition = course.scenarioState[condition.variable];
    const conditionPath = `${path}[${index}]`;

    if (!definition) {
      issues.push(
        `${conditionPath} references unknown state variable "${condition.variable}".`
      );
      return;
    }

    if (condition.equals !== undefined) {
      validateScenarioStateValue(
        definition,
        condition.equals,
        `${conditionPath}.equals`,
        issues
      );
    }

    if (condition.notEquals !== undefined) {
      validateScenarioStateValue(
        definition,
        condition.notEquals,
        `${conditionPath}.notEquals`,
        issues
      );
    }

    (condition.oneOf ?? []).forEach((value, valueIndex) => {
      validateScenarioStateValue(
        definition,
        value,
        `${conditionPath}.oneOf[${valueIndex}]`,
        issues
      );
    });

    if (
      (condition.gt !== undefined ||
        condition.gte !== undefined ||
        condition.lt !== undefined ||
        condition.lte !== undefined) &&
      definition.type !== "number"
    ) {
      issues.push(
        `${conditionPath} uses numeric comparisons, but "${condition.variable}" is ${definition.type} state.`
      );
    }
  });
}

function validateScenarioStateUpdates(
  updates: ScenarioStateUpdate[] | null | undefined,
  course: CanonicalCourse,
  path: string,
  issues: string[]
): void {
  (updates ?? []).forEach((update, index) => {
    const definition = course.scenarioState[update.variable];
    const updatePath = `${path}[${index}]`;

    if (!definition) {
      issues.push(
        `${updatePath} updates unknown state variable "${update.variable}".`
      );
      return;
    }

    if (update.type === "set") {
      validateScenarioStateValue(definition, update.value, `${updatePath}.set`, issues);
      return;
    }

    if (definition.type !== "number") {
      issues.push(
        `${updatePath} uses ${update.type}, but "${update.variable}" is ${definition.type} state.`
      );
      return;
    }

    if (typeof update.value !== "number" || !Number.isFinite(update.value)) {
      issues.push(`${updatePath}.${update.type} must be a finite number.`);
    }
  });
}

function validateScenarioStateRoutes(
  routes: ScenarioStateRoute[] | null | undefined,
  course: CanonicalCourse,
  path: string,
  issues: string[],
  nodeIds?: Set<string>
): void {
  (routes ?? []).forEach((route, index) => {
    const routePath = `${path}[${index}]`;
    validateScenarioStateConditions(route.when, course, `${routePath}.when`, issues);

    if (nodeIds && !nodeIds.has(route.next)) {
      issues.push(`${routePath}.next references missing node "${route.next}".`);
    }
  });
}

function validateScenarioStateDefinitions(
  course: CanonicalCourse,
  issues: string[]
): void {
  course.scenarioStateOrder.forEach((stateId) => {
    const definition = course.scenarioState[stateId];

    if (!definition) {
      return;
    }

    if (definition.type === "enum" && definition.options.length === 0) {
      issues.push(`State "${stateId}" is enum state but does not declare any options.`);
    }

    validateScenarioStateValue(
      definition,
      definition.initialValue,
      `state.${stateId}.initial`,
      issues
    );
  });
}

function validateCanonicalNode(
  course: CanonicalCourse,
  node: CanonicalNode,
  nodeIds: Set<string>,
  issues: string[]
): void {
  if (node.type === "quiz") {
    const correctOptions = node.options.filter((option) => option.correct);

    if (correctOptions.length === 0) {
      issues.push(`Question "${node.id}" must mark at least one option as correct.`);
    }
  }

  validateLayoutConfiguration(node, issues);
  validateShellInteractionConfiguration(node, issues);
  node.scene.components.forEach((component) => {
    validateScenarioStateConditions(
      component.visibleWhen,
      course,
      `Node "${node.id}" component "${component.id}" visibility`,
      issues
    );
  });

  if (node.type === "content") {
    validateScenarioStateRoutes(
      node.nextWhen,
      course,
      `Node "${node.id}" nextWhen`,
      issues,
      nodeIds
    );

    if (node.nextWhen.length > 0 && !node.next) {
      issues.push(
        `Node "${node.id}" branches on state, but no fallback next step is configured.`
      );
    }
  }

  if (node.type === "choice") {
    node.options.forEach((option, index) => {
      validateScenarioStateUpdates(
        option.stateUpdates,
        course,
        `Node "${node.id}" option "${option.id}" stateUpdates`,
        issues
      );
      validateScenarioStateRoutes(
        option.nextWhen,
        course,
        `Node "${node.id}" option "${option.id}" nextWhen`,
        issues,
        nodeIds
      );

      if (option.nextWhen.length > 0 && !option.next) {
        issues.push(
          `Node "${node.id}" option "${option.id}" branches on state, but no fallback next step is configured.`
        );
      }
    });
  }

  if (node.type === "quiz") {
    node.options.forEach((option) => {
      validateScenarioStateUpdates(
        option.stateUpdates,
        course,
        `Node "${node.id}" option "${option.id}" stateUpdates`,
        issues
      );
    });

    validateScenarioStateRoutes(
      node.passNextWhen,
      course,
      `Node "${node.id}" passNextWhen`,
      issues,
      nodeIds
    );
    validateScenarioStateRoutes(
      node.failNextWhen,
      course,
      `Node "${node.id}" failNextWhen`,
      issues,
      nodeIds
    );
    validateScenarioStateRoutes(
      node.nextWhen,
      course,
      `Node "${node.id}" nextWhen`,
      issues,
      nodeIds
    );

    if (node.passNextWhen.length > 0 && !node.passNext && !node.next) {
      issues.push(
        `Node "${node.id}" branches on pass state, but no fallback pass path is configured.`
      );
    }

    if (node.failNextWhen.length > 0 && !node.failNext && !node.next) {
      issues.push(
        `Node "${node.id}" branches on fail state, but no fallback fail path is configured.`
      );
    }
  }

  issues.push(...validateNodeScene(node));
}

function validateShellInteractionConfiguration(
  node: CanonicalNode,
  issues: string[]
): void {
  if (node.interactions.length === 0) {
    return;
  }

  if (!node.shell) {
    issues.push(
      `Node "${node.id}" defines shell interactions but does not use a simulation shell.`
    );
    return;
  }

  if (node.type !== "choice" && node.type !== "quiz") {
    issues.push(
      `Node "${node.id}" uses shell interactions, but ${node.sourceType} nodes cannot handle learner action outcomes.`
    );
    return;
  }

  const allowedTypes = allowedInteractionTypesForShell(node.shell);
  if (!allowedTypes) {
    issues.push(
      `Node "${node.id}" uses shell interactions with shell "${node.shell}". Choose email, chat, or dashboard shell for shell-specific actions.`
    );
    return;
  }

  const optionIds = new Set(
    node.type === "choice"
      ? node.options.map((option) => option.id)
      : node.options.map((option) => option.id)
  );
  const interactionIds = new Set<string>();

  node.interactions.forEach((interaction) => {
    if (interactionIds.has(interaction.id)) {
      issues.push(
        `Node "${node.id}" has duplicate interaction id "${interaction.id}".`
      );
    } else {
      interactionIds.add(interaction.id);
    }

    if (!allowedTypes.has(interaction.type)) {
      issues.push(
        `Node "${node.id}" uses shell "${node.shell}" with interaction "${interaction.type}". Choose an interaction that matches the selected shell.`
      );
    }

    if (!optionIds.has(interaction.optionId)) {
      issues.push(
        `Node "${node.id}" interaction "${interaction.id}" points to option "${interaction.optionId}", but that option does not exist.`
      );
    }
  });
}

export function normalizeCourseDocument(document: CourseDocument): CanonicalCourse {
  const nodes: Record<string, CanonicalNode> = {};
  const stateDefinitions = normalizeScenarioStateDefinitions(document.state);

  for (const node of document.nodes) {
    if (nodes[node.id]) {
      continue;
    }

    nodes[node.id] = normalizeNode(node);
  }

  const maxScore = document.nodes.reduce(
    (score, node) => score + sourceNodeMaxScore(node),
    0
  );

  return {
    id: document.id,
    title: document.title,
    description: document.description ?? "",
    theme: normalizeTheme(document.theme),
    scenarioState: stateDefinitions.definitions,
    scenarioStateOrder: stateDefinitions.order,
    startNodeId: document.start,
    passingScore: document.passingScore,
    maxScore,
    nodeOrder: document.nodes.map((node) => node.id),
    edges: [],
    nodes,
  };
}

export function validateCanonicalCourse(
  document: CourseDocument,
  canonicalCourse: CanonicalCourse
): string[] {
  const issues: string[] = [];
  const nodeIds = new Set<string>();
  const edges: CompiledEdge[] = [];

  for (const node of document.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push(`Duplicate node id "${node.id}".`);
      continue;
    }

    nodeIds.add(node.id);
  }

  for (const node of document.nodes) {
    const canonicalNode = canonicalCourse.nodes[node.id];
    if (canonicalNode) {
      validateCanonicalNode(canonicalCourse, canonicalNode, nodeIds, issues);
    }
  }

  validateScenarioStateDefinitions(canonicalCourse, issues);

  if (!nodeIds.has(document.start)) {
    issues.push(`Start node "${document.start}" does not exist.`);
  }

  if (!document.nodes.some((node) => node.type === "result")) {
    issues.push("Course must include at least one result node.");
  }

  Object.values(canonicalCourse.nodes).forEach((node) => {
    switch (node.type) {
      case "content":
        pushEdge(edges, issues, nodeIds, node.id, node.next, "next");
        node.nextWhen.forEach((route, routeIndex) => {
          pushEdge(
            edges,
            issues,
            nodeIds,
            node.id,
            route.next,
            `nextWhen:${routeIndex + 1}`
          );
        });
        break;
      case "choice":
        (node as CompiledChoiceNode).options.forEach((option) => {
          pushEdge(edges, issues, nodeIds, node.id, option.next, `option:${option.id}`);
          option.nextWhen.forEach((route, routeIndex) => {
            pushEdge(
              edges,
              issues,
              nodeIds,
              node.id,
              route.next,
              `option:${option.id}:nextWhen:${routeIndex + 1}`
            );
          });
        });
        break;
      case "quiz":
        pushEdge(edges, issues, nodeIds, node.id, node.passNext, "passNext");
        pushEdge(edges, issues, nodeIds, node.id, node.failNext, "failNext");
        pushEdge(edges, issues, nodeIds, node.id, node.next, "next");
        node.passNextWhen.forEach((route, routeIndex) => {
          pushEdge(
            edges,
            issues,
            nodeIds,
            node.id,
            route.next,
            `passNextWhen:${routeIndex + 1}`
          );
        });
        node.failNextWhen.forEach((route, routeIndex) => {
          pushEdge(
            edges,
            issues,
            nodeIds,
            node.id,
            route.next,
            `failNextWhen:${routeIndex + 1}`
          );
        });
        node.nextWhen.forEach((route, routeIndex) => {
          pushEdge(
            edges,
            issues,
            nodeIds,
            node.id,
            route.next,
            `nextWhen:${routeIndex + 1}`
          );
        });
        break;
      case "result":
        break;
    }
  });

  if (document.passingScore > canonicalCourse.maxScore) {
    issues.push(
      `Passing score ${document.passingScore} exceeds the compiled max score ${canonicalCourse.maxScore}.`
    );
  }

  canonicalCourse.edges = edges;

  return issues;
}

export function compileCourse(document: CourseDocument): CanonicalCourse {
  const canonicalCourse = normalizeCourseDocument(document);
  const issues = validateCanonicalCourse(document, canonicalCourse);

  if (issues.length > 0) {
    throw new CourseCompilationError(issues);
  }

  return canonicalCourse;
}

export function serializeCompiledCourse(course: CanonicalCourse): string {
  return JSON.stringify(course, null, 2);
}
