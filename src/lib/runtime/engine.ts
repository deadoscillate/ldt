import type {
  CompiledChoiceNode,
  CompiledCourse,
  CompiledNode,
  CompiledQuizNode,
} from "@/lib/course/types";
import type {
  ChoiceAnswerRecord,
  QuizAnswerRecord,
  RuntimeAnswerRecord,
  RuntimeState,
} from "@/lib/runtime/types";

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

function createBaseState(course: CompiledCourse): RuntimeState {
  return {
    courseId: course.id,
    currentNodeId: course.startNodeId,
    score: 0,
    history: [course.startNodeId],
    answers: {},
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

function transitionToNode(
  course: CompiledCourse,
  state: RuntimeState,
  nextNodeId: string | null
): RuntimeState {
  if (!nextNodeId) {
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
): { answer: QuizAnswerRecord; nextNodeId: string | null } {
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
  const nextNodeId = isCorrect
    ? node.passNext ?? node.next
    : node.failNext ?? node.next;

  return {
    answer: {
      kind: "quiz",
      selectedOptionIds: dedupedSelections,
      isCorrect,
      scoreAwarded,
    },
    nextNodeId: nextNodeId ?? null,
  };
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

  return transitionToNode(course, state, currentNode.next);
}

export function applyChoiceSelection(
  course: CompiledCourse,
  state: RuntimeState,
  optionId: string
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

  const nextState = applyScoredAnswer(state, currentNode.id, {
    kind: "choice",
    selectedOptionId: option.id,
    scoreAwarded: option.score,
  });

  return transitionToNode(course, nextState, option.next);
}

export function submitQuizAnswer(
  course: CompiledCourse,
  state: RuntimeState,
  selectedOptionIds: string[]
): RuntimeState {
  const currentNode = getCurrentNode(course, state);

  if (currentNode.type !== "quiz") {
    return state;
  }

  const quizNode = currentNode as CompiledQuizNode;

  if (!quizNode.multiple && selectedOptionIds.length > 1) {
    return state;
  }

  const { answer, nextNodeId } = evaluateQuiz(quizNode, selectedOptionIds);
  const nextState = applyScoredAnswer(state, quizNode.id, answer);

  return transitionToNode(course, nextState, nextNodeId);
}
