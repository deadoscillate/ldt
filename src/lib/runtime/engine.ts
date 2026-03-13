import type {
  CompiledChoiceNode,
  CompiledCourse,
  CompiledNode,
  CompiledQuizNode,
  ScenarioStateValue,
} from "@/lib/course/types";
import {
  applyScenarioStateUpdates,
  createScenarioStateRecord,
  resolveScenarioStateRoute,
} from "@/lib/course/scenario-state";
import type {
  ChoiceAnswerRecord,
  QuizAnswerRecord,
  RuntimeActionRecord,
  RuntimeAnswerRecord,
  RuntimeState,
} from "@/lib/runtime/types";

export interface ResolvedNodeInteraction {
  interactionId: string;
  optionId: string;
  actionMode: "trigger" | "toggle";
  feedback: string;
  correct: boolean | null;
  scoreDelta: number | null;
  nextNodeId: string | null;
}

function timestamp(): string {
  return new Date().toISOString();
}

function resolveNodeId(course: CompiledCourse, nodeId: string | null): string | null {
  if (!nodeId) {
    return null;
  }

  return course.nodes[nodeId] ? nodeId : null;
}

function createHistory(
  startNodeId: string,
  history: string[],
  currentNodeId: string
): string[] {
  const nextHistory = history.filter((nodeId) => Boolean(nodeId));

  if (nextHistory.length === 0 || nextHistory[0] !== startNodeId) {
    nextHistory.unshift(startNodeId);
  }

  if (nextHistory[nextHistory.length - 1] !== currentNodeId) {
    nextHistory.push(currentNodeId);
  }

  return nextHistory;
}

function answerScore(answer: RuntimeAnswerRecord | undefined): number {
  return answer?.scoreAwarded ?? 0;
}

function isValidScenarioStateValue(
  course: CompiledCourse,
  key: string,
  value: unknown
): value is ScenarioStateValue {
  const definition = course.scenarioState[key];

  if (!definition) {
    return false;
  }

  switch (definition.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
    case "enum":
      return typeof value === "string" && definition.options.includes(value);
  }
}

function normalizeScenarioState(
  course: CompiledCourse,
  values: Record<string, unknown> | null | undefined
): Record<string, ScenarioStateValue> {
  const nextValues = createScenarioStateRecord(course.scenarioState);

  Object.entries(values ?? {}).forEach(([key, value]) => {
    if (isValidScenarioStateValue(course, key, value)) {
      nextValues[key] = value;
    }
  });

  return nextValues;
}

function appendActionHistory(
  state: RuntimeState,
  record: Omit<RuntimeActionRecord, "timestamp">
): RuntimeActionRecord[] {
  return [
    ...state.actionHistory,
    {
      ...record,
      timestamp: timestamp(),
    },
  ];
}

function createBaseState(course: CompiledCourse): RuntimeState {
  return {
    courseId: course.id,
    currentNodeId: course.startNodeId,
    score: 0,
    history: [course.startNodeId],
    answers: {},
    scenarioState: createScenarioStateRecord(course.scenarioState),
    actionHistory: [],
    completed: course.nodes[course.startNodeId]?.type === "result",
    updatedAt: timestamp(),
  };
}

function normalizeAnswers(
  course: CompiledCourse,
  answers: Record<string, RuntimeAnswerRecord>
): Record<string, RuntimeAnswerRecord> {
  const nextAnswers: Record<string, RuntimeAnswerRecord> = {};

  for (const [nodeId, answer] of Object.entries(answers)) {
    if (course.nodes[nodeId]) {
      nextAnswers[nodeId] = answer;
    }
  }

  return nextAnswers;
}

function normalizeActionHistory(
  course: CompiledCourse,
  records: RuntimeActionRecord[] | undefined
): RuntimeActionRecord[] {
  return (records ?? []).filter((record) => Boolean(course.nodes[record.nodeId]));
}

function transitionToNode(
  course: CompiledCourse,
  state: RuntimeState,
  nextNodeId: string | null
): RuntimeState {
  if (!nextNodeId || !course.nodes[nextNodeId]) {
    return {
      ...state,
      completed: true,
      updatedAt: timestamp(),
    };
  }

  const nextNode = course.nodes[nextNodeId];

  return {
    ...state,
    currentNodeId: nextNodeId,
    history: [...state.history, nextNodeId],
    completed: nextNode.type === "result",
    updatedAt: timestamp(),
  };
}

function applyScoredAnswer(
  state: RuntimeState,
  nodeId: string,
  answer: ChoiceAnswerRecord | QuizAnswerRecord
): RuntimeState {
  const previousAnswer = state.answers[nodeId];
  const nextScore =
    state.score - answerScore(previousAnswer) + answer.scoreAwarded;

  return {
    ...state,
    score: nextScore,
    answers: {
      ...state.answers,
      [nodeId]: answer,
    },
  };
}

function evaluateQuiz(
  node: CompiledQuizNode,
  selectedOptionIds: string[]
): { answer: QuizAnswerRecord; passed: boolean } {
  const dedupedSelections = [...new Set(selectedOptionIds)];
  const selectedSet = new Set(dedupedSelections);
  const correctOptions = node.options
    .filter((option) => option.correct)
    .map((option) => option.id);
  const correctSet = new Set(correctOptions);

  const isCorrect =
    selectedSet.size === correctSet.size &&
    correctOptions.every((optionId) => selectedSet.has(optionId));

  const scoreAwarded = isCorrect ? node.correctScore : node.incorrectScore;

  return {
    answer: {
      kind: "quiz",
      selectedOptionIds: dedupedSelections,
      isCorrect,
      scoreAwarded,
    },
    passed: isCorrect,
  };
}

function resolveChoiceOptionNext(
  option: CompiledChoiceNode["options"][number],
  state: RuntimeState
): string | null {
  return resolveScenarioStateRoute(option.nextWhen, state.scenarioState, option.next);
}

function resolveQuizNext(
  node: CompiledQuizNode,
  state: RuntimeState,
  passed: boolean
): string | null {
  if (passed) {
    return resolveScenarioStateRoute(
      node.passNextWhen,
      state.scenarioState,
      node.passNext ?? node.next
    );
  }

  return resolveScenarioStateRoute(
    node.failNextWhen,
    state.scenarioState,
    node.failNext ?? node.next
  );
}

export function resolveNodeInteraction(
  node: CompiledNode,
  interactionId: string
): ResolvedNodeInteraction | null {
  const interaction = node.interactions.find(
    (candidate) => candidate.id === interactionId
  );

  if (!interaction) {
    return null;
  }

  if (node.type === "choice") {
    const option = (node as CompiledChoiceNode).options.find(
      (candidate) => candidate.id === interaction.optionId
    );

    return {
      interactionId: interaction.id,
      optionId: interaction.optionId,
      actionMode: "trigger",
      feedback: interaction.feedback || option?.feedback || "",
      correct: null,
      scoreDelta: option?.score ?? null,
      nextNodeId: option?.next ?? null,
    };
  }

  if (node.type === "quiz") {
    const option = (node as CompiledQuizNode).options.find(
      (candidate) => candidate.id === interaction.optionId
    );

    return {
      interactionId: interaction.id,
      optionId: interaction.optionId,
      actionMode: "toggle",
      feedback: interaction.feedback || option?.feedback || "",
      correct: option?.correct ?? null,
      scoreDelta: null,
      nextNodeId: null,
    };
  }

  return null;
}

export function initializeRuntime(
  course: CompiledCourse,
  persistedState?: RuntimeState | null
): RuntimeState {
  if (!persistedState || persistedState.courseId !== course.id) {
    return createBaseState(course);
  }

  const currentNodeId = resolveNodeId(course, persistedState.currentNodeId);

  if (!currentNodeId) {
    return createBaseState(course);
  }

  const answers = normalizeAnswers(course, persistedState.answers ?? {});

  return {
    courseId: course.id,
    currentNodeId,
    score: Number.isFinite(persistedState.score) ? persistedState.score : 0,
    history: createHistory(
      course.startNodeId,
      persistedState.history ?? [],
      currentNodeId
    ),
    answers,
    scenarioState: normalizeScenarioState(course, persistedState.scenarioState),
    actionHistory: normalizeActionHistory(course, persistedState.actionHistory),
    completed:
      persistedState.completed ||
      course.nodes[currentNodeId]?.type === "result" ||
      false,
    updatedAt: persistedState.updatedAt ?? timestamp(),
  };
}

export function restartRuntime(course: CompiledCourse): RuntimeState {
  return createBaseState(course);
}

export function getCurrentNode(
  course: CompiledCourse,
  state: RuntimeState
): CompiledNode {
  return course.nodes[state.currentNodeId] ?? course.nodes[course.startNodeId];
}

export function isPassingScore(
  course: CompiledCourse,
  state: RuntimeState
): boolean {
  return state.score >= course.passingScore;
}

export function advanceContentNode(
  course: CompiledCourse,
  state: RuntimeState
): RuntimeState {
  const currentNode = getCurrentNode(course, state);

  if (currentNode.type !== "content") {
    return state;
  }

  const nextNodeId = resolveScenarioStateRoute(
    currentNode.nextWhen,
    state.scenarioState,
    currentNode.next
  );

  return transitionToNode(course, {
    ...state,
    actionHistory: appendActionHistory(state, {
      nodeId: currentNode.id,
      action: "advance",
      optionIds: [],
      interactionIds: [],
    }),
  }, nextNodeId);
}

export function applyChoiceSelection(
  course: CompiledCourse,
  state: RuntimeState,
  optionId: string,
  interactionId?: string | null
): RuntimeState {
  const currentNode = getCurrentNode(course, state);

  if (currentNode.type !== "choice") {
    return state;
  }

  const option = (currentNode as CompiledChoiceNode).options.find(
    (candidate) => candidate.id === optionId
  );

  if (!option) {
    return state;
  }

  const nextScenarioState = applyScenarioStateUpdates(
    course.scenarioState,
    state.scenarioState,
    option.stateUpdates
  );
  const nextState = applyScoredAnswer(
    {
      ...state,
      scenarioState: nextScenarioState,
      actionHistory: appendActionHistory(state, {
        nodeId: currentNode.id,
        action: interactionId ? "interaction" : "choice",
        optionIds: [option.id],
        interactionIds: interactionId ? [interactionId] : [],
      }),
    },
    currentNode.id,
    {
      kind: "choice",
      selectedOptionId: option.id,
      scoreAwarded: option.score,
    }
  );

  return transitionToNode(course, nextState, resolveChoiceOptionNext(option, nextState));
}

export function submitQuizAnswer(
  course: CompiledCourse,
  state: RuntimeState,
  selectedOptionIds: string[],
  interactionIds: string[] = []
): RuntimeState {
  const currentNode = getCurrentNode(course, state);

  if (currentNode.type !== "quiz") {
    return state;
  }

  const quizNode = currentNode as CompiledQuizNode;

  if (!quizNode.multiple && selectedOptionIds.length > 1) {
    return state;
  }

  const { answer, passed } = evaluateQuiz(quizNode, selectedOptionIds);
  const selectedOptions = quizNode.options.filter((option) =>
    answer.selectedOptionIds.includes(option.id)
  );
  const nextScenarioState = selectedOptions.reduce(
    (values, option) =>
      applyScenarioStateUpdates(course.scenarioState, values, option.stateUpdates),
    state.scenarioState
  );
  const nextState = applyScoredAnswer(
    {
      ...state,
      scenarioState: nextScenarioState,
      actionHistory: appendActionHistory(state, {
        nodeId: quizNode.id,
        action: interactionIds.length > 0 ? "interaction" : "quiz",
        optionIds: answer.selectedOptionIds,
        interactionIds,
      }),
    },
    quizNode.id,
    answer
  );

  return transitionToNode(course, nextState, resolveQuizNext(quizNode, nextState, passed));
}
