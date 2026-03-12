export type CourseNodeType = "content" | "choice" | "quiz" | "result";

export interface CompiledEdge {
  from: string;
  to: string;
  label: string;
}

interface BaseCompiledNode {
  id: string;
  type: CourseNodeType;
  title: string;
  body: string;
}

export interface CompiledContentNode extends BaseCompiledNode {
  type: "content";
  next: string | null;
}

export interface CompiledChoiceOption {
  id: string;
  label: string;
  next: string;
  score: number;
}

export interface CompiledChoiceNode extends BaseCompiledNode {
  type: "choice";
  options: CompiledChoiceOption[];
}

export interface CompiledQuizOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface CompiledQuizNode extends BaseCompiledNode {
  type: "quiz";
  question: string;
  multiple: boolean;
  options: CompiledQuizOption[];
  correctScore: number;
  incorrectScore: number;
  passNext: string | null;
  failNext: string | null;
  next: string | null;
}

export interface CompiledResultNode extends BaseCompiledNode {
  type: "result";
  outcome: "passed" | "failed" | "neutral";
}

export type CompiledNode =
  | CompiledContentNode
  | CompiledChoiceNode
  | CompiledQuizNode
  | CompiledResultNode;

export interface CompiledCourse {
  id: string;
  title: string;
  description: string;
  startNodeId: string;
  passingScore: number;
  maxScore: number;
  nodeOrder: string[];
  edges: CompiledEdge[];
  nodes: Record<string, CompiledNode>;
}
