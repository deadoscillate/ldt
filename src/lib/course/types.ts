export type CourseNodeType = "content" | "choice" | "quiz" | "result";
export type CourseAuthorNodeType =
  | "content"
  | "choice"
  | "branch"
  | "quiz"
  | "question"
  | "result";
export type CourseLayoutType =
  | "title"
  | "text"
  | "image"
  | "video"
  | "two-column"
  | "image-left"
  | "image-right"
  | "quote"
  | "callout"
  | "question"
  | "result";

export interface CompiledTheme {
  primary: string | null;
  secondary: string | null;
  font: string | null;
  logo: string | null;
  background: string | null;
}

export interface CompiledMedia {
  type: "image" | "video";
  src: string;
  alt: string;
  caption: string;
}

export interface CompiledQuoteBlock {
  text: string;
  attribution: string;
}

export interface CompiledCalloutBlock {
  title: string;
  text: string;
}

export interface CompiledLayoutColumn {
  title: string;
  text: string;
  image: string | null;
  video: string | null;
}

export interface CompiledEdge {
  from: string;
  to: string;
  label: string;
}

interface BaseCompiledNode {
  id: string;
  type: CourseNodeType;
  sourceType: CourseAuthorNodeType;
  title: string;
  body: string;
  layout: CourseLayoutType | null;
  media: CompiledMedia | null;
  left: CompiledLayoutColumn | null;
  right: CompiledLayoutColumn | null;
  quote: CompiledQuoteBlock | null;
  callout: CompiledCalloutBlock | null;
}

export interface CompiledContentNode extends BaseCompiledNode {
  type: "content";
  sourceType: "content";
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
  sourceType: "choice" | "branch";
  options: CompiledChoiceOption[];
}

export interface CompiledQuizOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface CompiledQuizNode extends BaseCompiledNode {
  type: "quiz";
  sourceType: "quiz" | "question";
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
  sourceType: "result";
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
  theme: CompiledTheme;
  startNodeId: string;
  passingScore: number;
  maxScore: number;
  nodeOrder: string[];
  edges: CompiledEdge[];
  nodes: Record<string, CompiledNode>;
}
