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

export interface RuntimeState {
  courseId: string;
  currentNodeId: string;
  score: number;
  history: string[];
  answers: Record<string, RuntimeAnswerRecord>;
  completed: boolean;
  updatedAt: string;
}
