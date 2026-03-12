export const CANONICAL_NODE_TYPES = ["content", "choice", "quiz", "result"] as const;
export type CourseNodeType = (typeof CANONICAL_NODE_TYPES)[number];

export const PUBLIC_AUTHOR_NODE_TYPES = [
  "content",
  "question",
  "choice",
  "branch",
  "result",
] as const;
export type PublicAuthorNodeType = (typeof PUBLIC_AUTHOR_NODE_TYPES)[number];

export const LEGACY_AUTHOR_NODE_TYPE_ALIASES = {
  quiz: "question",
} as const;
export type LegacyAuthorNodeType = keyof typeof LEGACY_AUTHOR_NODE_TYPE_ALIASES;

export type CourseAuthorNodeType = PublicAuthorNodeType | LegacyAuthorNodeType;

export const COURSE_LAYOUT_TYPES = [
  "title",
  "text",
  "image",
  "video",
  "two-column",
  "image-left",
  "image-right",
  "quote",
  "callout",
  "question",
  "result",
] as const;
export type CourseLayoutType = (typeof COURSE_LAYOUT_TYPES)[number];

export interface CompiledThemeFontFace {
  id: string;
  family: string;
  source: string;
  weight: string;
  style: string;
  format: string;
}

export interface CompiledTheme {
  id: string | null;
  name: string | null;
  description: string | null;
  author: string | null;
  version: string | null;
  runtimeCompatibility: string | null;
  supportedLayouts: CourseLayoutType[];
  primary: string | null;
  secondary: string | null;
  accent: string | null;
  font: string | null;
  headingFont: string | null;
  baseSize: string | null;
  headingScale: number | null;
  logo: string | null;
  background: string | null;
  surface: string | null;
  surfaceStrong: string | null;
  text: string | null;
  mutedText: string | null;
  border: string | null;
  success: string | null;
  danger: string | null;
  panelPadding: string | null;
  sectionGap: string | null;
  cardGap: string | null;
  buttonRadius: string | null;
  cardRadius: string | null;
  borderStyle: string | null;
  fontFaces: CompiledThemeFontFace[];
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

export type CanonicalCourse = CompiledCourse;
export type CanonicalNode = CompiledNode;
