"use client";

import type { ChangeEvent } from "react";

import {
  createEmptyBuilderNode,
  type BuilderCourse,
  type BuilderNode,
  type BuilderScenarioStateVariable,
  type BuilderStateCondition,
  type BuilderStateRoute,
  type BuilderStateUpdate,
  type BuilderShellInteraction,
} from "@/lib/course/builder";
import {
  AUTHOR_SCENE_SHELLS,
  COURSE_LAYOUT_TYPES,
  PUBLIC_AUTHOR_NODE_TYPES,
  type AuthorSceneShell,
  type CompiledCourse,
  type ShellInteractionType,
} from "@/lib/course/types";

interface CourseBuilderProps {
  course: BuilderCourse;
  compiledCourse: CompiledCourse | null;
  validationErrors: string[];
  onChange: (course: BuilderCourse) => void;
}

function updateNodeAtIndex(
  course: BuilderCourse,
  nodeIndex: number,
  nextNode: BuilderNode
): BuilderCourse {
  return {
    ...course,
    nodes: course.nodes.map((node, index) => (index === nodeIndex ? nextNode : node)),
  };
}

function updateArrayAtIndex<T>(items: T[], index: number, nextItem: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function nextIdOptions(course: BuilderCourse): string[] {
  return course.nodes.map((node) => node.id);
}

function buildNodeTypeLabel(type: BuilderNode["type"]): string {
  switch (type) {
    case "branch":
      return "Branch";
    case "question":
      return "Question";
    default:
      return type[0].toUpperCase() + type.slice(1);
  }
}

function buildShellLabel(shell: BuilderNode["shell"]): string {
  switch (shell) {
    case "email_shell":
      return "Email shell";
    case "chat_shell":
      return "Chat shell";
    case "dashboard_shell":
      return "Dashboard shell";
    default:
      return "Card shell";
  }
}

function interactionTypesForShell(
  shell: AuthorSceneShell
): readonly ShellInteractionType[] {
  switch (shell) {
    case "email_shell":
      return ["email_link", "email_attachment", "email_action_button"];
    case "chat_shell":
      return ["chat_reply_option", "chat_choice_message"];
    case "dashboard_shell":
      return [
        "dashboard_action_card",
        "dashboard_flag_toggle",
        "dashboard_review_item",
      ];
    default:
      return [];
  }
}

function buildInteractionTypeLabel(type: ShellInteractionType): string {
  switch (type) {
    case "email_link":
      return "Email link";
    case "email_attachment":
      return "Email attachment";
    case "email_action_button":
      return "Email action button";
    case "chat_reply_option":
      return "Chat reply option";
    case "chat_choice_message":
      return "Chat choice message";
    case "dashboard_action_card":
      return "Dashboard action card";
    case "dashboard_flag_toggle":
      return "Dashboard flag toggle";
    case "dashboard_review_item":
      return "Dashboard review item";
  }
}

function createBuilderInteraction(
  shell: AuthorSceneShell,
  index: number,
  optionId = ""
): BuilderShellInteraction {
  const defaultType = interactionTypesForShell(shell)[0] ?? "email_action_button";

  return {
    id: `interaction-${index + 1}`,
    type: defaultType,
    optionId,
    label: defaultType === "chat_choice_message" ? "" : "New action",
    title:
      defaultType === "dashboard_action_card" || defaultType === "dashboard_review_item"
        ? "Review item"
        : "",
    text: defaultType === "chat_choice_message" ? "New message" : "",
    hrefLabel: "https://example.com",
    fileName: "attachment.pdf",
    variant: "primary",
    status: "neutral",
    sender: "Colleague",
    timestamp: "",
    role: "other",
    feedback: "",
    visibleIf: [],
  };
}

function createStateVariable(index: number): BuilderScenarioStateVariable {
  return {
    id: `state_${index + 1}`,
    type: "boolean",
    initial: "false",
    description: "",
    optionsText: "",
  };
}

function createStateCondition(defaultVariable = ""): BuilderStateCondition {
  return {
    variable: defaultVariable,
    operator: "equals",
    value: "",
  };
}

function createStateRoute(defaultVariable = ""): BuilderStateRoute {
  return {
    next: "",
    conditions: [createStateCondition(defaultVariable)],
  };
}

function createStateUpdate(defaultVariable = ""): BuilderStateUpdate {
  return {
    variable: defaultVariable,
    mode: "set",
    value: "",
  };
}

export function CourseBuilder({
  course,
  compiledCourse,
  validationErrors,
  onChange,
}: CourseBuilderProps) {
  const nodeIds = nextIdOptions(course);
  const stateVariableIds = course.stateVariables.map((definition) => definition.id);

  function updateCourseField<Key extends keyof BuilderCourse>(
    key: Key,
    value: BuilderCourse[Key]
  ): void {
    onChange({
      ...course,
      [key]: value,
    });
  }

  function updateStateVariableField<Key extends keyof BuilderScenarioStateVariable>(
    variableIndex: number,
    key: Key,
    value: BuilderScenarioStateVariable[Key]
  ): void {
    updateCourseField(
      "stateVariables",
      updateArrayAtIndex(course.stateVariables, variableIndex, {
        ...course.stateVariables[variableIndex],
        [key]: value,
      })
    );
  }

  function addStateVariable(): void {
    updateCourseField("stateVariables", [
      ...course.stateVariables,
      createStateVariable(course.stateVariables.length),
    ]);
  }

  function removeStateVariable(variableIndex: number): void {
    updateCourseField(
      "stateVariables",
      course.stateVariables.filter((_, index) => index !== variableIndex)
    );
  }

  function updateNodeField<Key extends keyof BuilderNode>(
    nodeIndex: number,
    key: Key,
    value: BuilderNode[Key]
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    onChange(
      updateNodeAtIndex(course, nodeIndex, {
        ...node,
        [key]: value,
      })
    );
  }

  function updateNodeConditionCollection(
    nodeIndex: number,
    key:
      | "calloutVisibleIf"
      | "emailWarningBannerVisibleIf"
      | "chatSystemNoticeVisibleIf"
      | "dashboardNoticeVisibleIf",
    conditions: BuilderStateCondition[]
  ): void {
    updateNodeField(nodeIndex, key, conditions);
  }

  function updateNodeRouteCollection(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routes: BuilderStateRoute[]
  ): void {
    updateNodeField(nodeIndex, key, routes);
  }

  function updateNodeRouteField(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routeIndex: number,
    field: keyof BuilderStateRoute,
    value: string | BuilderStateCondition[]
  ): void {
    const routes = course.nodes[nodeIndex]?.[key];

    if (!routes) {
      return;
    }

    updateNodeRouteCollection(
      nodeIndex,
      key,
      updateArrayAtIndex(routes, routeIndex, {
        ...routes[routeIndex],
        [field]: value,
      })
    );
  }

  function updateNodeRouteConditionField(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routeIndex: number,
    conditionIndex: number,
    field: keyof BuilderStateCondition,
    value: string
  ): void {
    const route = course.nodes[nodeIndex]?.[key][routeIndex];

    if (!route) {
      return;
    }

    updateNodeRouteField(
      nodeIndex,
      key,
      routeIndex,
      "conditions",
      updateArrayAtIndex(route.conditions, conditionIndex, {
        ...route.conditions[conditionIndex],
        [field]: value,
      })
    );
  }

  function addNodeRoute(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen"
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeRouteCollection(nodeIndex, key, [
      ...node[key],
      createStateRoute(stateVariableIds[0] ?? ""),
    ]);
  }

  function removeNodeRoute(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routeIndex: number
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeRouteCollection(
      nodeIndex,
      key,
      node[key].filter((_, index) => index !== routeIndex)
    );
  }

  function addNodeRouteCondition(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routeIndex: number
  ): void {
    const route = course.nodes[nodeIndex]?.[key][routeIndex];

    if (!route) {
      return;
    }

    updateNodeRouteField(nodeIndex, key, routeIndex, "conditions", [
      ...route.conditions,
      createStateCondition(stateVariableIds[0] ?? ""),
    ]);
  }

  function removeNodeRouteCondition(
    nodeIndex: number,
    key: "nextWhen" | "passNextWhen" | "failNextWhen",
    routeIndex: number,
    conditionIndex: number
  ): void {
    const route = course.nodes[nodeIndex]?.[key][routeIndex];

    if (!route) {
      return;
    }

    updateNodeRouteField(
      nodeIndex,
      key,
      routeIndex,
      "conditions",
      route.conditions.filter((_, index) => index !== conditionIndex)
    );
  }

  function handleNodeTypeChange(
    nodeIndex: number,
    nextType: BuilderNode["type"]
  ): void {
    const existingNode = course.nodes[nodeIndex];

    if (!existingNode) {
      return;
    }

    const freshNode = createEmptyBuilderNode(nodeIndex, nextType);
    onChange(
      updateNodeAtIndex(course, nodeIndex, {
        ...freshNode,
        id: existingNode.id,
        title: existingNode.title,
        body: existingNode.body,
      })
    );
  }

  function handleOptionChange<Key extends keyof BuilderNode["options"][number]>(
    nodeIndex: number,
    optionIndex: number,
    key: Key,
    value: BuilderNode["options"][number][Key]
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    const nextOptions = node.options.map((option, index) =>
      index === optionIndex
        ? {
            ...option,
            [key]: value,
          }
        : option
    );

    updateNodeField(nodeIndex, "options", nextOptions);
  }

  function updateOptionStateUpdates(
    nodeIndex: number,
    optionIndex: number,
    updates: BuilderStateUpdate[]
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    handleOptionChange(nodeIndex, optionIndex, "stateUpdates", updates);
  }

  function updateOptionStateUpdateField(
    nodeIndex: number,
    optionIndex: number,
    updateIndex: number,
    field: keyof BuilderStateUpdate,
    value: string
  ): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionStateUpdates(
      nodeIndex,
      optionIndex,
      updateArrayAtIndex(option.stateUpdates, updateIndex, {
        ...option.stateUpdates[updateIndex],
        [field]: value,
      })
    );
  }

  function addOptionStateUpdate(nodeIndex: number, optionIndex: number): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionStateUpdates(nodeIndex, optionIndex, [
      ...option.stateUpdates,
      createStateUpdate(stateVariableIds[0] ?? ""),
    ]);
  }

  function removeOptionStateUpdate(
    nodeIndex: number,
    optionIndex: number,
    updateIndex: number
  ): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionStateUpdates(
      nodeIndex,
      optionIndex,
      option.stateUpdates.filter((_, index) => index !== updateIndex)
    );
  }

  function updateOptionRoutes(
    nodeIndex: number,
    optionIndex: number,
    routes: BuilderStateRoute[]
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    handleOptionChange(nodeIndex, optionIndex, "nextWhen", routes);
  }

  function updateOptionRouteField(
    nodeIndex: number,
    optionIndex: number,
    routeIndex: number,
    field: keyof BuilderStateRoute,
    value: string | BuilderStateCondition[]
  ): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionRoutes(
      nodeIndex,
      optionIndex,
      updateArrayAtIndex(option.nextWhen, routeIndex, {
        ...option.nextWhen[routeIndex],
        [field]: value,
      })
    );
  }

  function updateOptionRouteConditionField(
    nodeIndex: number,
    optionIndex: number,
    routeIndex: number,
    conditionIndex: number,
    field: keyof BuilderStateCondition,
    value: string
  ): void {
    const route = course.nodes[nodeIndex]?.options[optionIndex]?.nextWhen[routeIndex];

    if (!route) {
      return;
    }

    updateOptionRouteField(nodeIndex, optionIndex, routeIndex, "conditions", [
      ...route.conditions.slice(0, conditionIndex),
      {
        ...route.conditions[conditionIndex],
        [field]: value,
      },
      ...route.conditions.slice(conditionIndex + 1),
    ]);
  }

  function addOptionRoute(nodeIndex: number, optionIndex: number): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionRoutes(nodeIndex, optionIndex, [
      ...option.nextWhen,
      createStateRoute(stateVariableIds[0] ?? ""),
    ]);
  }

  function removeOptionRoute(
    nodeIndex: number,
    optionIndex: number,
    routeIndex: number
  ): void {
    const option = course.nodes[nodeIndex]?.options[optionIndex];

    if (!option) {
      return;
    }

    updateOptionRoutes(
      nodeIndex,
      optionIndex,
      option.nextWhen.filter((_, index) => index !== routeIndex)
    );
  }

  function addOptionRouteCondition(
    nodeIndex: number,
    optionIndex: number,
    routeIndex: number
  ): void {
    const route = course.nodes[nodeIndex]?.options[optionIndex]?.nextWhen[routeIndex];

    if (!route) {
      return;
    }

    updateOptionRouteField(nodeIndex, optionIndex, routeIndex, "conditions", [
      ...route.conditions,
      createStateCondition(stateVariableIds[0] ?? ""),
    ]);
  }

  function removeOptionRouteCondition(
    nodeIndex: number,
    optionIndex: number,
    routeIndex: number,
    conditionIndex: number
  ): void {
    const route = course.nodes[nodeIndex]?.options[optionIndex]?.nextWhen[routeIndex];

    if (!route) {
      return;
    }

    updateOptionRouteField(
      nodeIndex,
      optionIndex,
      routeIndex,
      "conditions",
      route.conditions.filter((_, index) => index !== conditionIndex)
    );
  }

  function handleChatMessageChange(
    nodeIndex: number,
    messageIndex: number,
    key: keyof BuilderNode["chatMessages"][number],
    value: string
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "chatMessages",
      node.chatMessages.map((message, index) =>
        index === messageIndex ? { ...message, [key]: value } : message
      )
    );
  }

  function addChatMessage(nodeIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(nodeIndex, "chatMessages", [
      ...node.chatMessages,
      {
        sender: "Colleague",
        text: "New message",
        timestamp: "",
        role: "other",
        visibleIf: [],
      },
    ]);
  }

  function removeChatMessage(nodeIndex: number, messageIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "chatMessages",
      node.chatMessages.filter((_, index) => index !== messageIndex)
    );
  }

  function handleDashboardCardChange(
    nodeIndex: number,
    cardIndex: number,
    key: keyof BuilderNode["dashboardCards"][number],
    value: string
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "dashboardCards",
      node.dashboardCards.map((card, index) =>
        index === cardIndex ? { ...card, [key]: value } : card
      )
    );
  }

  function addDashboardCard(nodeIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(nodeIndex, "dashboardCards", [
      ...node.dashboardCards,
      {
        title: "Queue item",
        text: "",
        metricLabel: "",
        metricValue: "",
        status: "neutral",
        visibleIf: [],
      },
    ]);
  }

  function removeDashboardCard(nodeIndex: number, cardIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "dashboardCards",
      node.dashboardCards.filter((_, index) => index !== cardIndex)
    );
  }

  function handleInteractionChange(
    nodeIndex: number,
    interactionIndex: number,
    key: keyof BuilderShellInteraction,
    value: string
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "interactions",
      node.interactions.map((interaction, index) =>
        index === interactionIndex
          ? {
              ...interaction,
              [key]: value,
            }
          : interaction
      )
    );
  }

  function handleInteractionTypeChange(
    nodeIndex: number,
    interactionIndex: number,
    nextType: ShellInteractionType
  ): void {
    const node = course.nodes[nodeIndex];
    const interaction = node?.interactions[interactionIndex];

    if (!node || !interaction) {
      return;
    }

    const replacement = createBuilderInteraction(
      node.shell,
      interactionIndex,
      interaction.optionId
    );

    updateNodeField(
      nodeIndex,
      "interactions",
      node.interactions.map((candidate, index) =>
        index === interactionIndex
          ? {
              ...replacement,
              id: interaction.id,
              optionId: interaction.optionId,
              type: nextType,
            }
          : candidate
      )
    );
  }

  function addInteraction(
    nodeIndex: number,
    interactionType?: ShellInteractionType
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    const nextInteraction = createBuilderInteraction(
      node.shell,
      node.interactions.length,
      node.options[0]?.id ?? ""
    );

    if (interactionType) {
      nextInteraction.type = interactionType;
    }

    updateNodeField(nodeIndex, "interactions", [
      ...node.interactions,
      nextInteraction,
    ]);
  }

  function removeInteraction(nodeIndex: number, interactionIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "interactions",
      node.interactions.filter((_, index) => index !== interactionIndex)
    );
  }

  function addOption(nodeIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(nodeIndex, "options", [
      ...node.options,
      {
        id: `option-${node.options.length + 1}`,
        label: "New option",
        next: "",
        score: "0",
        correct: false,
        stateUpdates: [],
        nextWhen: [],
      },
    ]);
  }

  function removeOption(nodeIndex: number, optionIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node || node.options.length <= 2) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "options",
      node.options.filter((_, index) => index !== optionIndex)
    );
  }

  function addNode(type: BuilderNode["type"]): void {
    onChange({
      ...course,
      nodes: [...course.nodes, createEmptyBuilderNode(course.nodes.length, type)],
    });
  }

  function removeNode(nodeIndex: number): void {
    if (course.nodes.length <= 2) {
      return;
    }

    onChange({
      ...course,
      nodes: course.nodes.filter((_, index) => index !== nodeIndex),
    });
  }

  function renderTargetSelect(
    value: string,
    onValueChange: (nextValue: string) => void,
    id: string
  ) {
    return (
      <select
        className="template-field-input"
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      >
        <option value="">None</option>
        {nodeIds.map((nodeId) => (
          <option key={nodeId} value={nodeId}>
            {nodeId}
          </option>
        ))}
      </select>
    );
  }

  function summarizeComponentProps(
    component: CompiledCourse["nodes"][string]["scene"]["components"][number]
  ): string {
    switch (component.type) {
      case "title":
      case "paragraph":
        return `text="${component.text}"`;
      case "image":
        return `${component.mediaType}="${component.src}"`;
      case "callout":
        return `variant=${component.variant}`;
      case "button":
        return `variant=${component.variant}`;
      case "email_header":
        return `from="${component.from}"`;
      case "email_body":
        return `text="${component.text}"`;
      case "email_attachment_list":
        return `${component.attachments.length} attachment(s)`;
      case "email_warning_banner":
        return `severity=${component.severity}`;
      case "chat_message":
        return `${component.sender} (${component.role})`;
      case "chat_system_notice":
        return "system notice";
      case "card":
        return `status=${component.status}`;
      case "metric":
        return `${component.label}=${component.value}`;
      case "status_badge":
        return `status=${component.status}`;
      case "panel_title":
        return `text="${component.text}"`;
      case "dashboard_notice":
        return `variant=${component.variant}`;
      case "email_link":
        return `option=${component.optionId}`;
      case "email_attachment":
        return `option=${component.optionId}`;
      case "email_action_button":
        return `option=${component.optionId}`;
      case "chat_reply_option":
        return `option=${component.optionId}`;
      case "chat_choice_message":
        return `${component.sender} -> option=${component.optionId}`;
      case "dashboard_action_card":
        return `option=${component.optionId}`;
      case "dashboard_flag_toggle":
        return `option=${component.optionId}`;
      case "dashboard_review_item":
        return `option=${component.optionId}`;
      case "question_block":
        return component.multiple ? "multiple=true" : "multiple=false";
      case "result_card":
        return `outcome=${component.outcome}`;
      case "quote":
        return component.attribution ? `attribution="${component.attribution}"` : "quote";
      case "divider":
        return component.label ? `label="${component.label}"` : "divider";
      case "list":
        return `${component.items.length} item(s)`;
      default:
        return "";
    }
  }

  function renderConditionEditor(params: {
    title: string;
    conditions: BuilderStateCondition[];
    onChange: (conditions: BuilderStateCondition[]) => void;
  }) {
    const { title, conditions, onChange } = params;

    return (
      <div className="builder-field-stack">
        <div className="section-heading-row">
          <strong>{title}</strong>
          <button
            className="ghost-button"
            onClick={() =>
              onChange([...conditions, createStateCondition(stateVariableIds[0] ?? "")])
            }
            type="button"
          >
            Add condition
          </button>
        </div>
        {conditions.length === 0 ? (
          <p className="panel-copy">
            No state conditions yet. Add one to make this element respond to prior
            learner actions.
          </p>
        ) : null}
        {conditions.map((condition, conditionIndex) => (
          <div className="builder-option-card" key={`${title}-${conditionIndex}`}>
            <div className="template-data-grid">
              <label className="template-field">
                <span className="template-field-label">State variable</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    onChange(
                      updateArrayAtIndex(conditions, conditionIndex, {
                        ...condition,
                        variable: event.target.value,
                      })
                    )
                  }
                  value={condition.variable}
                >
                  <option value="">Select a state variable</option>
                  {stateVariableIds.map((variableId) => (
                    <option key={variableId} value={variableId}>
                      {variableId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Operator</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    onChange(
                      updateArrayAtIndex(conditions, conditionIndex, {
                        ...condition,
                        operator: event.target.value as BuilderStateCondition["operator"],
                      })
                    )
                  }
                  value={condition.operator}
                >
                  <option value="equals">equals</option>
                  <option value="notEquals">not equals</option>
                  <option value="oneOf">one of</option>
                  <option value="gt">greater than</option>
                  <option value="gte">greater than or equal</option>
                  <option value="lt">less than</option>
                  <option value="lte">less than or equal</option>
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">
                  {condition.operator === "oneOf" ? "Values" : "Value"}
                </span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    onChange(
                      updateArrayAtIndex(conditions, conditionIndex, {
                        ...condition,
                        value: event.target.value,
                      })
                    )
                  }
                  placeholder={
                    condition.operator === "oneOf"
                      ? "critical, escalated"
                      : "true"
                  }
                  value={condition.value}
                />
              </label>
            </div>
            <button
              className="ghost-button"
              onClick={() =>
                onChange(conditions.filter((_, index) => index !== conditionIndex))
              }
              type="button"
            >
              Remove condition
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderRouteEditor(params: {
    title: string;
    routes: BuilderStateRoute[];
    onRoutesChange: (routes: BuilderStateRoute[]) => void;
  }) {
    const { title, routes, onRoutesChange } = params;

    return (
      <div className="builder-field-stack">
        <div className="section-heading-row">
          <strong>{title}</strong>
          <button
            className="ghost-button"
            onClick={() =>
              onRoutesChange([...routes, createStateRoute(stateVariableIds[0] ?? "")])
            }
            type="button"
          >
            Add conditional route
          </button>
        </div>
        {routes.length === 0 ? (
          <p className="panel-copy">
            No conditional routes yet. Add one to change the next scene when
            scenario state matches a condition.
          </p>
        ) : null}
        {routes.map((route, routeIndex) => (
          <div className="builder-option-card" key={`${title}-${routeIndex}`}>
            <label className="template-field">
              <span className="template-field-label">Next step</span>
              {renderTargetSelect(
                route.next,
                (nextValue) =>
                  onRoutesChange(
                    updateArrayAtIndex(routes, routeIndex, {
                      ...route,
                      next: nextValue,
                    })
                  ),
                `${title}-route-${routeIndex}`
              )}
            </label>
            {renderConditionEditor({
              title: "Conditions",
              conditions: route.conditions,
              onChange: (conditions) =>
                onRoutesChange(
                  updateArrayAtIndex(routes, routeIndex, {
                    ...route,
                    conditions,
                  })
                ),
            })}
            <button
              className="ghost-button"
              onClick={() =>
                onRoutesChange(routes.filter((_, index) => index !== routeIndex))
              }
              type="button"
            >
              Remove conditional route
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderStateUpdateEditor(params: {
    title: string;
    updates: BuilderStateUpdate[];
    onUpdatesChange: (updates: BuilderStateUpdate[]) => void;
  }) {
    const { title, updates, onUpdatesChange } = params;

    return (
      <div className="builder-field-stack">
        <div className="section-heading-row">
          <strong>{title}</strong>
          <button
            className="ghost-button"
            onClick={() =>
              onUpdatesChange([
                ...updates,
                createStateUpdate(stateVariableIds[0] ?? ""),
              ])
            }
            type="button"
          >
            Add state update
          </button>
        </div>
        {updates.length === 0 ? (
          <p className="panel-copy">
            No state updates yet. Add one to persist this learner decision into
            later scenes.
          </p>
        ) : null}
        {updates.map((update, updateIndex) => (
          <div className="builder-option-card" key={`${title}-${updateIndex}`}>
            <div className="template-data-grid">
              <label className="template-field">
                <span className="template-field-label">State variable</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    onUpdatesChange(
                      updateArrayAtIndex(updates, updateIndex, {
                        ...update,
                        variable: event.target.value,
                      })
                    )
                  }
                  value={update.variable}
                >
                  <option value="">Select a state variable</option>
                  {stateVariableIds.map((variableId) => (
                    <option key={variableId} value={variableId}>
                      {variableId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Update type</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    onUpdatesChange(
                      updateArrayAtIndex(updates, updateIndex, {
                        ...update,
                        mode: event.target.value as BuilderStateUpdate["mode"],
                      })
                    )
                  }
                  value={update.mode}
                >
                  <option value="set">set</option>
                  <option value="increment">increment</option>
                  <option value="decrement">decrement</option>
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Value</span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    onUpdatesChange(
                      updateArrayAtIndex(updates, updateIndex, {
                        ...update,
                        value: event.target.value,
                      })
                    )
                  }
                  value={update.value}
                />
              </label>
            </div>
            <button
              className="ghost-button"
              onClick={() =>
                onUpdatesChange(updates.filter((_, index) => index !== updateIndex))
              }
              type="button"
            >
              Remove state update
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="builder-shell">
      <div className="builder-header">
        <div>
          <p className="eyebrow">Course Builder</p>
          <h2>Guided authoring layer</h2>
          <p className="panel-copy">
            Use structured forms to generate course YAML internally. Source remains the
            source of truth, and each step now compiles into a scene shell plus
            ordered components for preview and export rendering.
          </p>
        </div>
      </div>

      <div className="builder-grid">
        <article className="panel builder-panel">
          <p className="eyebrow">Course Metadata</p>
          <div className="template-data-grid">
            <label className="template-field">
              <span className="template-field-label">Course id</span>
              <input
                className="template-field-input"
                onChange={(event) => updateCourseField("id", event.target.value)}
                value={course.id}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Course title</span>
              <input
                className="template-field-input"
                onChange={(event) => updateCourseField("title", event.target.value)}
                value={course.title}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Description</span>
              <input
                className="template-field-input"
                onChange={(event) =>
                  updateCourseField("description", event.target.value)
                }
                value={course.description}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Start node</span>
              {renderTargetSelect(
                course.start,
                (nextValue) => updateCourseField("start", nextValue),
                "builder-course-start"
              )}
            </label>
            <label className="template-field">
              <span className="template-field-label">Passing score</span>
              <input
                className="template-field-input"
                onChange={(event) =>
                  updateCourseField("passingScore", event.target.value)
                }
                type="number"
                value={course.passingScore}
              />
            </label>
          </div>
        </article>

        <article className="panel builder-panel">
          <p className="eyebrow">Scenario State</p>
          <p className="panel-copy">
            Define persistent state once, then use it to branch between scenes,
            show shell feedback, and carry learner decisions forward.
          </p>
          <div className="section-heading-row">
            <strong>State variables</strong>
            <button className="ghost-button" onClick={addStateVariable} type="button">
              Add variable
            </button>
          </div>
          {course.stateVariables.length === 0 ? (
            <p className="panel-copy">
              No scenario variables yet. Add flags like <code>reportedPhishing</code>{" "}
              or scores like <code>riskScore</code> to make the simulation stateful.
            </p>
          ) : null}
          {course.stateVariables.map((definition, variableIndex) => (
            <div className="builder-option-card" key={definition.id || variableIndex}>
              <div className="template-data-grid">
                <label className="template-field">
                  <span className="template-field-label">Variable id</span>
                  <input
                    className="template-field-input"
                    onChange={(event) =>
                      updateStateVariableField(variableIndex, "id", event.target.value)
                    }
                    value={definition.id}
                  />
                </label>
                <label className="template-field">
                  <span className="template-field-label">Type</span>
                  <select
                    className="template-field-input"
                    onChange={(event) =>
                      updateStateVariableField(
                        variableIndex,
                        "type",
                        event.target.value as BuilderScenarioStateVariable["type"]
                      )
                    }
                    value={definition.type}
                  >
                    <option value="boolean">boolean</option>
                    <option value="number">number</option>
                    <option value="string">string</option>
                    <option value="enum">enum</option>
                  </select>
                </label>
                <label className="template-field">
                  <span className="template-field-label">Initial value</span>
                  {definition.type === "boolean" ? (
                    <select
                      className="template-field-input"
                      onChange={(event) =>
                        updateStateVariableField(
                          variableIndex,
                          "initial",
                          event.target.value
                        )
                      }
                      value={definition.initial}
                    >
                      <option value="false">false</option>
                      <option value="true">true</option>
                    </select>
                  ) : (
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateStateVariableField(
                          variableIndex,
                          "initial",
                          event.target.value
                        )
                      }
                      type={definition.type === "number" ? "number" : "text"}
                      value={definition.initial}
                    />
                  )}
                </label>
                <label className="template-field">
                  <span className="template-field-label">Description</span>
                  <input
                    className="template-field-input"
                    onChange={(event) =>
                      updateStateVariableField(
                        variableIndex,
                        "description",
                        event.target.value
                      )
                    }
                    value={definition.description}
                  />
                </label>
                {definition.type === "enum" ? (
                  <label className="template-field">
                    <span className="template-field-label">Allowed values</span>
                    <textarea
                      className="feedback-textarea"
                      onChange={(event) =>
                        updateStateVariableField(
                          variableIndex,
                          "optionsText",
                          event.target.value
                        )
                      }
                      rows={3}
                      value={definition.optionsText}
                    />
                  </label>
                ) : null}
              </div>
              <button
                className="ghost-button"
                onClick={() => removeStateVariable(variableIndex)}
                type="button"
              >
                Remove variable
              </button>
            </div>
          ))}
        </article>

        <article className="panel builder-panel">
          <p className="eyebrow">Structured Source</p>
          <p className="panel-copy">
            Builder mode edits source structure only. Scene shells and components are
            derived at compile time, while branding remains a separate theme-pack
            build layer so templates stay reusable across course families.
          </p>
        </article>
      </div>

      <div className="builder-actions">
        <button className="ghost-button" onClick={() => addNode("content")} type="button">
          Add Content
        </button>
        <button className="ghost-button" onClick={() => addNode("question")} type="button">
          Add Question
        </button>
        <button className="ghost-button" onClick={() => addNode("choice")} type="button">
          Add Choice
        </button>
        <button className="ghost-button" onClick={() => addNode("branch")} type="button">
          Add Branch
        </button>
        <button className="ghost-button" onClick={() => addNode("result")} type="button">
          Add Result
        </button>
      </div>

      <div className="builder-node-list">
        {course.nodes.map((node, nodeIndex) => (
          <article className="panel builder-panel builder-node-card" key={nodeIndex}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Step {nodeIndex + 1}</p>
                <h3>{buildNodeTypeLabel(node.type)}</h3>
              </div>
              <button
                className="ghost-button"
                onClick={() => removeNode(nodeIndex)}
                type="button"
              >
                Remove step
              </button>
            </div>

            <div className="template-data-grid">
              <label className="template-field">
                <span className="template-field-label">Node type</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    handleNodeTypeChange(
                      nodeIndex,
                      event.target.value as BuilderNode["type"]
                    )
                  }
                  value={node.type}
                >
                  {PUBLIC_AUTHOR_NODE_TYPES.map((nodeType) => (
                    <option key={nodeType} value={nodeType}>
                      {nodeType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Node id</span>
                <input
                  className="template-field-input"
                  onChange={(event) => updateNodeField(nodeIndex, "id", event.target.value)}
                  value={node.id}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Title</span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(nodeIndex, "title", event.target.value)
                  }
                  value={node.title}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Scene shell</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(
                      nodeIndex,
                      "shell",
                      event.target.value as BuilderNode["shell"]
                    )
                  }
                  value={node.shell}
                >
                  {AUTHOR_SCENE_SHELLS.map((shell) => (
                    <option key={shell} value={shell}>
                      {buildShellLabel(shell)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Layout</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(
                      nodeIndex,
                      "layout",
                      event.target.value as BuilderNode["layout"]
                    )
                  }
                  value={node.layout}
                >
                  {COURSE_LAYOUT_TYPES.map((layoutType) => (
                    <option key={layoutType} value={layoutType}>
                      {layoutType}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="panel-copy">
              {node.shell === "email_shell"
                ? "Email shell simulates a message review workflow with sender metadata, message body, and learner actions."
                : node.shell === "chat_shell"
                  ? "Chat shell simulates a conversation-based decision where messages compile into a structured chat stream."
                  : node.shell === "dashboard_shell"
                    ? "Dashboard shell simulates an interface-based review workflow with nav items, cards, and status indicators."
                    : "Card shell keeps the standard structured scene presentation. Layout-driven steps still compile into result or two-column shells until you choose an explicit simulation shell."}
            </p>
            <p className="panel-copy">
              {node.shell === "email_shell"
                ? "Recommended fields: sender, subject, preview text, warning banner, and attachments."
                : node.shell === "chat_shell"
                  ? "Recommended fields: conversation title, system notice, and a short message stream."
                  : node.shell === "dashboard_shell"
                    ? "Recommended fields: panel title, nav items, notice, and status cards."
                    : "Use shell-specific fields only when you want a constrained simulation frame instead of the default authored layout."}
            </p>

            <label className="template-field">
              <span className="template-field-label">Content text</span>
              <textarea
                className="feedback-textarea"
                onChange={(event) => updateNodeField(nodeIndex, "body", event.target.value)}
                rows={4}
                value={node.body}
              />
            </label>

            {node.type === "content" ? (
              <div className="builder-field-stack">
                <label className="template-field">
                  <span className="template-field-label">Fallback next step</span>
                  {renderTargetSelect(
                    node.next,
                    (nextValue) => updateNodeField(nodeIndex, "next", nextValue),
                    `builder-next-${nodeIndex}`
                  )}
                </label>
                {renderRouteEditor({
                  title: "Conditional next steps",
                  routes: node.nextWhen,
                  onRoutesChange: (routes) =>
                    updateNodeRouteCollection(nodeIndex, "nextWhen", routes),
                })}
              </div>
            ) : null}

            {node.type === "question" ? (
              <div className="builder-field-stack">
                <label className="template-field">
                  <span className="template-field-label">Question prompt</span>
                  <input
                    className="template-field-input"
                    onChange={(event) =>
                      updateNodeField(nodeIndex, "prompt", event.target.value)
                    }
                    value={node.prompt}
                  />
                </label>
                <div className="template-data-grid">
                  <label className="template-field">
                    <span className="template-field-label">Pass next</span>
                    {renderTargetSelect(
                      node.passNext,
                      (nextValue) => updateNodeField(nodeIndex, "passNext", nextValue),
                      `builder-pass-${nodeIndex}`
                    )}
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Fail next</span>
                    {renderTargetSelect(
                      node.failNext,
                      (nextValue) => updateNodeField(nodeIndex, "failNext", nextValue),
                      `builder-fail-${nodeIndex}`
                    )}
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Correct score</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "correctScore", event.target.value)
                      }
                      type="number"
                      value={node.correctScore}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Incorrect score</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "incorrectScore", event.target.value)
                      }
                      type="number"
                      value={node.incorrectScore}
                    />
                  </label>
                </div>
                {renderRouteEditor({
                  title: "Conditional pass routes",
                  routes: node.passNextWhen,
                  onRoutesChange: (routes) =>
                    updateNodeRouteCollection(nodeIndex, "passNextWhen", routes),
                })}
                {renderRouteEditor({
                  title: "Conditional fail routes",
                  routes: node.failNextWhen,
                  onRoutesChange: (routes) =>
                    updateNodeRouteCollection(nodeIndex, "failNextWhen", routes),
                })}
              </div>
            ) : null}

            {node.type === "choice" || node.type === "branch" || node.type === "question" ? (
              <div className="builder-option-list">
                <div className="section-heading-row">
                  <strong>Options</strong>
                  <button className="ghost-button" onClick={() => addOption(nodeIndex)} type="button">
                    Add option
                  </button>
                </div>
                {node.options.map((option, optionIndex) => (
                  <div className="builder-option-card" key={`${node.id}-${optionIndex}`}>
                    <div className="template-data-grid">
                      <label className="template-field">
                        <span className="template-field-label">Option id</span>
                        <input
                          className="template-field-input"
                          onChange={(event) =>
                            handleOptionChange(
                              nodeIndex,
                              optionIndex,
                              "id",
                              event.target.value
                            )
                          }
                          value={option.id}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Label</span>
                        <input
                          className="template-field-input"
                          onChange={(event) =>
                            handleOptionChange(
                              nodeIndex,
                              optionIndex,
                              "label",
                              event.target.value
                            )
                          }
                          value={option.label}
                        />
                      </label>
                      {node.type === "choice" || node.type === "branch" ? (
                        <label className="template-field">
                          <span className="template-field-label">Next step</span>
                          {renderTargetSelect(
                            option.next,
                            (nextValue) =>
                              handleOptionChange(nodeIndex, optionIndex, "next", nextValue),
                            `builder-option-next-${nodeIndex}-${optionIndex}`
                          )}
                        </label>
                      ) : null}
                      {node.type === "choice" ? (
                        <label className="template-field">
                          <span className="template-field-label">Score</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              handleOptionChange(
                                nodeIndex,
                                optionIndex,
                                "score",
                                event.target.value
                              )
                            }
                            type="number"
                            value={option.score}
                          />
                        </label>
                      ) : null}
                      {node.type === "question" ? (
                        <label className="template-field checkbox-field">
                          <span className="template-field-label">Correct answer</span>
                          <input
                            checked={option.correct}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleOptionChange(
                                nodeIndex,
                                optionIndex,
                                "correct",
                                event.target.checked
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                      ) : null}
                    </div>
                    {renderStateUpdateEditor({
                      title: "State updates",
                      updates: option.stateUpdates,
                      onUpdatesChange: (updates) =>
                        updateOptionStateUpdates(nodeIndex, optionIndex, updates),
                    })}
                    {node.type === "choice" || node.type === "branch" ? (
                      renderRouteEditor({
                        title: "Conditional next steps",
                        routes: option.nextWhen,
                        onRoutesChange: (routes) =>
                          updateOptionRoutes(nodeIndex, optionIndex, routes),
                      })
                    ) : null}
                    <button
                      className="ghost-button"
                      onClick={() => removeOption(nodeIndex, optionIndex)}
                      type="button"
                    >
                      Remove option
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {node.shell !== "card" &&
            (node.type === "choice" || node.type === "branch" || node.type === "question") ? (
              <details className="details-panel" open>
                <summary>Shell interactions</summary>
                <div className="details-copy">
                  <p className="panel-copy">
                    Shell interactions turn options into realistic in-shell actions.
                    The mapped option still controls branching and scoring; this layer
                    only changes how the learner sees and triggers that option.
                  </p>
                  <div className="section-heading-row">
                    <strong>Suggested interactions</strong>
                    <div className="builder-pill-row">
                      {interactionTypesForShell(node.shell).map((interactionType) => (
                        <button
                          className="ghost-button"
                          key={`${node.id}-${interactionType}`}
                          onClick={() => addInteraction(nodeIndex, interactionType)}
                          type="button"
                        >
                          Add {buildInteractionTypeLabel(interactionType)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {node.interactions.length === 0 ? (
                    <p className="panel-copy">
                      No shell interactions yet. Add one to replace generic option
                      buttons with email, chat, or dashboard actions.
                    </p>
                  ) : null}
                  {node.interactions.map((interaction, interactionIndex) => {
                    const linkedOption = node.options.find(
                      (option) => option.id === interaction.optionId
                    );

                    return (
                      <div
                        className="builder-option-card"
                        key={`${node.id}-interaction-${interaction.id}`}
                      >
                        <div className="template-data-grid">
                          <label className="template-field">
                            <span className="template-field-label">Interaction id</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleInteractionChange(
                                  nodeIndex,
                                  interactionIndex,
                                  "id",
                                  event.target.value
                                )
                              }
                              value={interaction.id}
                            />
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Component type</span>
                            <select
                              className="template-field-input"
                              onChange={(event) =>
                                handleInteractionTypeChange(
                                  nodeIndex,
                                  interactionIndex,
                                  event.target.value as ShellInteractionType
                                )
                              }
                              value={interaction.type}
                            >
                              {interactionTypesForShell(node.shell).map((interactionType) => (
                                <option key={interactionType} value={interactionType}>
                                  {buildInteractionTypeLabel(interactionType)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Mapped option</span>
                            <select
                              className="template-field-input"
                              onChange={(event) =>
                                handleInteractionChange(
                                  nodeIndex,
                                  interactionIndex,
                                  "optionId",
                                  event.target.value
                                )
                              }
                              value={interaction.optionId}
                            >
                              <option value="">Select an option</option>
                              {node.options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.id}
                                </option>
                              ))}
                            </select>
                          </label>
                          {(interaction.type === "email_link" ||
                            interaction.type === "email_attachment" ||
                            interaction.type === "email_action_button" ||
                            interaction.type === "chat_reply_option" ||
                            interaction.type === "dashboard_flag_toggle") && (
                            <label className="template-field">
                              <span className="template-field-label">Label</span>
                              <input
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "label",
                                    event.target.value
                                  )
                                }
                                value={interaction.label}
                              />
                            </label>
                          )}
                          {(interaction.type === "dashboard_action_card" ||
                            interaction.type === "dashboard_review_item") && (
                            <label className="template-field">
                              <span className="template-field-label">Title</span>
                              <input
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "title",
                                    event.target.value
                                  )
                                }
                                value={interaction.title}
                              />
                            </label>
                          )}
                          {interaction.type === "chat_choice_message" && (
                            <>
                              <label className="template-field">
                                <span className="template-field-label">Sender</span>
                                <input
                                  className="template-field-input"
                                  onChange={(event) =>
                                    handleInteractionChange(
                                      nodeIndex,
                                      interactionIndex,
                                      "sender",
                                      event.target.value
                                    )
                                  }
                                  value={interaction.sender}
                                />
                              </label>
                              <label className="template-field">
                                <span className="template-field-label">Role</span>
                                <select
                                  className="template-field-input"
                                  onChange={(event) =>
                                    handleInteractionChange(
                                      nodeIndex,
                                      interactionIndex,
                                      "role",
                                      event.target.value
                                    )
                                  }
                                  value={interaction.role}
                                >
                                  <option value="other">other</option>
                                  <option value="self">self</option>
                                </select>
                              </label>
                              <label className="template-field">
                                <span className="template-field-label">Timestamp</span>
                                <input
                                  className="template-field-input"
                                  onChange={(event) =>
                                    handleInteractionChange(
                                      nodeIndex,
                                      interactionIndex,
                                      "timestamp",
                                      event.target.value
                                    )
                                  }
                                  value={interaction.timestamp}
                                />
                              </label>
                            </>
                          )}
                          {interaction.type === "email_link" && (
                            <label className="template-field">
                              <span className="template-field-label">Link display</span>
                              <input
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "hrefLabel",
                                    event.target.value
                                  )
                                }
                                value={interaction.hrefLabel}
                              />
                            </label>
                          )}
                          {interaction.type === "email_attachment" && (
                            <label className="template-field">
                              <span className="template-field-label">Attachment file</span>
                              <input
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "fileName",
                                    event.target.value
                                  )
                                }
                                value={interaction.fileName}
                              />
                            </label>
                          )}
                          {interaction.type === "email_action_button" && (
                            <label className="template-field">
                              <span className="template-field-label">Button style</span>
                              <select
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "variant",
                                    event.target.value
                                  )
                                }
                                value={interaction.variant}
                              >
                                <option value="primary">primary</option>
                                <option value="secondary">secondary</option>
                              </select>
                            </label>
                          )}
                          {(interaction.type === "dashboard_action_card" ||
                            interaction.type === "dashboard_review_item" ||
                            interaction.type === "dashboard_flag_toggle") && (
                            <label className="template-field">
                              <span className="template-field-label">Status</span>
                              <select
                                className="template-field-input"
                                onChange={(event) =>
                                  handleInteractionChange(
                                    nodeIndex,
                                    interactionIndex,
                                    "status",
                                    event.target.value
                                  )
                                }
                                value={interaction.status}
                              >
                                <option value="neutral">neutral</option>
                                <option value="warning">warning</option>
                                <option value="positive">positive</option>
                                <option value="danger">danger</option>
                              </select>
                            </label>
                          )}
                        </div>
                        {interaction.type === "chat_choice_message" ||
                        interaction.type === "dashboard_action_card" ||
                        interaction.type === "dashboard_review_item" ? (
                          <label className="template-field">
                            <span className="template-field-label">
                              {interaction.type === "chat_choice_message"
                                ? "Message text"
                                : "Supporting text"}
                            </span>
                            <textarea
                              className="feedback-textarea"
                              onChange={(event) =>
                                handleInteractionChange(
                                  nodeIndex,
                                  interactionIndex,
                                  "text",
                                  event.target.value
                                )
                              }
                              rows={3}
                              value={interaction.text}
                            />
                          </label>
                        ) : null}
                        <label className="template-field">
                          <span className="template-field-label">Feedback</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              handleInteractionChange(
                                nodeIndex,
                                interactionIndex,
                                "feedback",
                                event.target.value
                              )
                            }
                            placeholder="Optional inline feedback shown when the learner selects this interaction."
                            rows={2}
                            value={interaction.feedback}
                          />
                        </label>
                        {renderConditionEditor({
                          title: "Interaction visibility",
                          conditions: interaction.visibleIf,
                          onChange: (conditions) =>
                            updateNodeField(
                              nodeIndex,
                              "interactions",
                              updateArrayAtIndex(node.interactions, interactionIndex, {
                                ...interaction,
                                visibleIf: conditions,
                              })
                            ),
                        })}
                        <p className="panel-copy">
                          {linkedOption
                            ? node.type === "question"
                              ? `Mapped outcome: option "${linkedOption.id}" is ${linkedOption.correct ? "correct" : "incorrect"}.`
                              : `Mapped outcome: option "${linkedOption.id}" goes to "${linkedOption.next || "end"}" and changes score by ${linkedOption.score}.`
                            : "Mapped outcome: choose an option so this interaction has a branch target."}
                        </p>
                        <button
                          className="ghost-button"
                          onClick={() => removeInteraction(nodeIndex, interactionIndex)}
                          type="button"
                        >
                          Remove interaction
                        </button>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : null}

            {node.type === "result" ? (
              <label className="template-field">
                <span className="template-field-label">Completion behavior</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(
                      nodeIndex,
                      "outcome",
                      event.target.value as BuilderNode["outcome"]
                    )
                  }
                  value={node.outcome}
                >
                  <option value="neutral">neutral</option>
                  <option value="passed">passed</option>
                  <option value="failed">failed</option>
                </select>
              </label>
            ) : null}

            {node.shell === "email_shell" ? (
              <details className="details-panel" open>
                <summary>Email shell fields</summary>
                <div className="details-copy">
                  <div className="template-data-grid">
                    <label className="template-field">
                      <span className="template-field-label">From</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(nodeIndex, "emailFrom", event.target.value)
                        }
                        value={node.emailFrom}
                      />
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">Subject</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(nodeIndex, "emailSubject", event.target.value)
                        }
                        value={node.emailSubject}
                      />
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">Preview text</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(
                            nodeIndex,
                            "emailPreviewText",
                            event.target.value
                          )
                        }
                        value={node.emailPreviewText}
                      />
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">Warning banner</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(
                            nodeIndex,
                            "emailWarningBanner",
                            event.target.value
                          )
                        }
                        value={node.emailWarningBanner}
                      />
                    </label>
                  </div>
                  <label className="template-field">
                    <span className="template-field-label">Attachments</span>
                    <textarea
                      className="feedback-textarea"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "emailAttachments", event.target.value)
                      }
                      placeholder="One attachment per line"
                      rows={3}
                      value={node.emailAttachments}
                    />
                  </label>
                  {renderConditionEditor({
                    title: "Warning banner visibility",
                    conditions: node.emailWarningBannerVisibleIf,
                    onChange: (conditions) =>
                      updateNodeConditionCollection(
                        nodeIndex,
                        "emailWarningBannerVisibleIf",
                        conditions
                      ),
                  })}
                </div>
              </details>
            ) : null}

            {node.shell === "chat_shell" ? (
              <details className="details-panel" open>
                <summary>Chat shell fields</summary>
                <div className="details-copy">
                  <div className="template-data-grid">
                    <label className="template-field">
                      <span className="template-field-label">Conversation title</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(nodeIndex, "chatTitle", event.target.value)
                        }
                        value={node.chatTitle}
                      />
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">System notice</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(
                            nodeIndex,
                            "chatSystemNotice",
                            event.target.value
                          )
                        }
                        value={node.chatSystemNotice}
                      />
                    </label>
                  </div>
                  {renderConditionEditor({
                    title: "System notice visibility",
                    conditions: node.chatSystemNoticeVisibleIf,
                    onChange: (conditions) =>
                      updateNodeConditionCollection(
                        nodeIndex,
                        "chatSystemNoticeVisibleIf",
                        conditions
                      ),
                  })}
                  <div className="builder-option-list">
                    <div className="section-heading-row">
                      <strong>Messages</strong>
                      <button
                        className="ghost-button"
                        onClick={() => addChatMessage(nodeIndex)}
                        type="button"
                      >
                        Add message
                      </button>
                    </div>
                    {node.chatMessages.map((message, messageIndex) => (
                      <div className="builder-option-card" key={`${node.id}-message-${messageIndex}`}>
                        <div className="template-data-grid">
                          <label className="template-field">
                            <span className="template-field-label">Sender</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleChatMessageChange(
                                  nodeIndex,
                                  messageIndex,
                                  "sender",
                                  event.target.value
                                )
                              }
                              value={message.sender}
                            />
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Role</span>
                            <select
                              className="template-field-input"
                              onChange={(event) =>
                                handleChatMessageChange(
                                  nodeIndex,
                                  messageIndex,
                                  "role",
                                  event.target.value
                                )
                              }
                              value={message.role}
                            >
                              <option value="other">other</option>
                              <option value="self">self</option>
                            </select>
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Timestamp</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleChatMessageChange(
                                  nodeIndex,
                                  messageIndex,
                                  "timestamp",
                                  event.target.value
                                )
                              }
                              value={message.timestamp}
                            />
                          </label>
                        </div>
                        <label className="template-field">
                          <span className="template-field-label">Message</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              handleChatMessageChange(
                                nodeIndex,
                                messageIndex,
                                "text",
                                event.target.value
                              )
                            }
                            rows={3}
                            value={message.text}
                          />
                        </label>
                        {renderConditionEditor({
                          title: "Message visibility",
                          conditions: message.visibleIf,
                          onChange: (conditions) =>
                            updateNodeField(
                              nodeIndex,
                              "chatMessages",
                              updateArrayAtIndex(node.chatMessages, messageIndex, {
                                ...message,
                                visibleIf: conditions,
                              })
                            ),
                        })}
                        <button
                          className="ghost-button"
                          onClick={() => removeChatMessage(nodeIndex, messageIndex)}
                          type="button"
                        >
                          Remove message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ) : null}

            {node.shell === "dashboard_shell" ? (
              <details className="details-panel" open>
                <summary>Dashboard shell fields</summary>
                <div className="details-copy">
                  <div className="template-data-grid">
                    <label className="template-field">
                      <span className="template-field-label">Panel title</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(nodeIndex, "dashboardTitle", event.target.value)
                        }
                        value={node.dashboardTitle}
                      />
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">Dashboard notice</span>
                      <input
                        className="template-field-input"
                        onChange={(event) =>
                          updateNodeField(nodeIndex, "dashboardNotice", event.target.value)
                        }
                        value={node.dashboardNotice}
                      />
                    </label>
                  </div>
                  <label className="template-field">
                    <span className="template-field-label">Sidebar nav items</span>
                    <textarea
                      className="feedback-textarea"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "dashboardNavItems", event.target.value)
                      }
                      placeholder="One nav item per line"
                      rows={3}
                      value={node.dashboardNavItems}
                    />
                  </label>
                  {renderConditionEditor({
                    title: "Dashboard notice visibility",
                    conditions: node.dashboardNoticeVisibleIf,
                    onChange: (conditions) =>
                      updateNodeConditionCollection(
                        nodeIndex,
                        "dashboardNoticeVisibleIf",
                        conditions
                      ),
                  })}
                  <div className="builder-option-list">
                    <div className="section-heading-row">
                      <strong>Dashboard cards</strong>
                      <button
                        className="ghost-button"
                        onClick={() => addDashboardCard(nodeIndex)}
                        type="button"
                      >
                        Add card
                      </button>
                    </div>
                    {node.dashboardCards.map((card, cardIndex) => (
                      <div className="builder-option-card" key={`${node.id}-card-${cardIndex}`}>
                        <div className="template-data-grid">
                          <label className="template-field">
                            <span className="template-field-label">Title</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleDashboardCardChange(
                                  nodeIndex,
                                  cardIndex,
                                  "title",
                                  event.target.value
                                )
                              }
                              value={card.title}
                            />
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Status</span>
                            <select
                              className="template-field-input"
                              onChange={(event) =>
                                handleDashboardCardChange(
                                  nodeIndex,
                                  cardIndex,
                                  "status",
                                  event.target.value
                                )
                              }
                              value={card.status}
                            >
                              <option value="neutral">neutral</option>
                              <option value="warning">warning</option>
                              <option value="positive">positive</option>
                              <option value="danger">danger</option>
                            </select>
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Metric label</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleDashboardCardChange(
                                  nodeIndex,
                                  cardIndex,
                                  "metricLabel",
                                  event.target.value
                                )
                              }
                              value={card.metricLabel}
                            />
                          </label>
                          <label className="template-field">
                            <span className="template-field-label">Metric value</span>
                            <input
                              className="template-field-input"
                              onChange={(event) =>
                                handleDashboardCardChange(
                                  nodeIndex,
                                  cardIndex,
                                  "metricValue",
                                  event.target.value
                                )
                              }
                              value={card.metricValue}
                            />
                          </label>
                        </div>
                        <label className="template-field">
                          <span className="template-field-label">Card text</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              handleDashboardCardChange(
                                nodeIndex,
                                cardIndex,
                                "text",
                                event.target.value
                              )
                            }
                            rows={3}
                            value={card.text}
                          />
                        </label>
                        {renderConditionEditor({
                          title: "Card visibility",
                          conditions: card.visibleIf,
                          onChange: (conditions) =>
                            updateNodeField(
                              nodeIndex,
                              "dashboardCards",
                              updateArrayAtIndex(node.dashboardCards, cardIndex, {
                                ...card,
                                visibleIf: conditions,
                              })
                            ),
                        })}
                        <button
                          className="ghost-button"
                          onClick={() => removeDashboardCard(nodeIndex, cardIndex)}
                          type="button"
                        >
                          Remove card
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ) : null}

            <details className="details-panel">
              <summary>Layout fields</summary>
              <div className="details-copy">
                <p className="panel-copy">
                  Configure only the layout primitives this step needs. Unused fields are
                  omitted from the generated source YAML.
                </p>
                <div className="template-data-grid">
                  <label className="template-field">
                    <span className="template-field-label">Media type</span>
                    <select
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(
                          nodeIndex,
                          "mediaType",
                          event.target.value as BuilderNode["mediaType"]
                        )
                      }
                      value={node.mediaType}
                    >
                      <option value="image">image</option>
                      <option value="video">video</option>
                    </select>
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media URL</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaSrc", event.target.value)
                      }
                      value={node.mediaSrc}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media alt text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaAlt", event.target.value)
                      }
                      value={node.mediaAlt}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media caption</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaCaption", event.target.value)
                      }
                      value={node.mediaCaption}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Quote text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "quoteText", event.target.value)
                      }
                      value={node.quoteText}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Quote attribution</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(
                          nodeIndex,
                          "quoteAttribution",
                          event.target.value
                        )
                      }
                      value={node.quoteAttribution}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Callout title</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "calloutTitle", event.target.value)
                      }
                      value={node.calloutTitle}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Callout text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "calloutText", event.target.value)
                      }
                      value={node.calloutText}
                    />
                  </label>
                </div>
                {renderConditionEditor({
                  title: "Callout visibility",
                  conditions: node.calloutVisibleIf,
                  onChange: (conditions) =>
                    updateNodeConditionCollection(
                      nodeIndex,
                      "calloutVisibleIf",
                      conditions
                    ),
                })}

                {node.layout === "two-column" ||
                node.layout === "image-left" ||
                node.layout === "image-right" ? (
                  <div className="builder-layout-columns">
                    <div>
                      <p className="eyebrow">Left column</p>
                      <div className="template-data-grid">
                        <label className="template-field">
                          <span className="template-field-label">Title</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftTitle", event.target.value)
                            }
                            value={node.leftTitle}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Text</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftText", event.target.value)
                            }
                            rows={3}
                            value={node.leftText}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Image URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftImage", event.target.value)
                            }
                            value={node.leftImage}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Video URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftVideo", event.target.value)
                            }
                            value={node.leftVideo}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="eyebrow">Right column</p>
                      <div className="template-data-grid">
                        <label className="template-field">
                          <span className="template-field-label">Title</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightTitle", event.target.value)
                            }
                            value={node.rightTitle}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Text</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightText", event.target.value)
                            }
                            rows={3}
                            value={node.rightText}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Image URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightImage", event.target.value)
                            }
                            value={node.rightImage}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Video URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightVideo", event.target.value)
                            }
                            value={node.rightVideo}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            {compiledCourse?.nodes[node.id] ? (
              <details className="details-panel">
                <summary>Scene components</summary>
                <div className="details-copy">
                  <p className="panel-copy">
                    This step compiles into the{" "}
                    <strong>{compiledCourse.nodes[node.id].scene.layout}</strong> shell.
                    The fields above remain the editing surface for component content
                    and props.
                  </p>
                  <ul className="scene-component-inspector">
                    {compiledCourse.nodes[node.id].scene.components.map((component) => (
                      <li key={component.id}>
                        <strong>{component.type}</strong>
                        <span>
                          slot <code>{component.slot}</code> |{" "}
                          {summarizeComponentProps(component)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : null}
          </article>
        ))}
      </div>

      {validationErrors.length > 0 ? (
        <div className="feedback-banner feedback-error">
          <strong>Builder validation</strong>
          <ul className="builder-validation-list">
            {validationErrors.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="feedback-banner feedback-success">
          <strong>Builder validation</strong>
          <span>The generated source is structurally valid and ready to preview.</span>
        </div>
      )}
    </section>
  );
}
