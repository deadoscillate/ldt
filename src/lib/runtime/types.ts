import type { ScenarioStateRecord } from "@/lib/course/scenario-state";

export interface ChoiceAnswerRecord {
  kind: "choice";
  selectedOptionId: string;
  scoreAwarded: number;
}

export interface QuizAnswerRecord {
  kind: "quiz";
  selectedOptionIds: string[];
  isCorrect: boolean;
  scoreAwarded: number;
}

export type RuntimeAnswerRecord = ChoiceAnswerRecord | QuizAnswerRecord;

export interface RuntimeActionRecord {
  nodeId: string;
  action: "advance" | "choice" | "quiz" | "interaction";
  optionIds: string[];
  interactionIds: string[];
  timestamp: string;
}

export interface RuntimeState {
  courseId: string;
  currentNodeId: string;
  score: number;
  history: string[];
  answers: Record<string, RuntimeAnswerRecord>;
  scenarioState: ScenarioStateRecord;
  actionHistory: RuntimeActionRecord[];
  completed: boolean;
  updatedAt: string;
}
