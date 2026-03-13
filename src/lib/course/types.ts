import {
  SCENARIO_STATE_TYPES,
  type ScenarioStateCondition,
  type ScenarioStateRoute,
  type ScenarioStateUpdate,
  type ScenarioStateValue,
  type ScenarioStateVariableDefinition,
} from "@/lib/course/scenario-state";

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

export const SCENE_LAYOUT_SHELLS = [
  "card",
  "stacked",
  "two_column",
  "email_shell",
  "chat_shell",
  "dashboard_shell",
  "result_shell",
] as const;
export type SceneLayoutShell = (typeof SCENE_LAYOUT_SHELLS)[number];

export const AUTHOR_SCENE_SHELLS = [
  "card",
  "email_shell",
  "chat_shell",
  "dashboard_shell",
] as const;
export type AuthorSceneShell = (typeof AUTHOR_SCENE_SHELLS)[number];

export const SCENE_COMPONENT_TYPES = [
  "title",
  "paragraph",
  "image",
  "callout",
  "button",
  "question_block",
  "result_card",
  "quote",
  "divider",
  "list",
  "email_header",
  "email_body",
  "email_attachment_list",
  "email_warning_banner",
  "chat_message",
  "chat_system_notice",
  "card",
  "metric",
  "status_badge",
  "panel_title",
  "dashboard_notice",
  "email_link",
  "email_attachment",
  "email_action_button",
  "chat_reply_option",
  "chat_choice_message",
  "dashboard_action_card",
  "dashboard_flag_toggle",
  "dashboard_review_item",
] as const;
export type SceneComponentType = (typeof SCENE_COMPONENT_TYPES)[number];

export const SHELL_INTERACTION_TYPES = [
  "email_link",
  "email_attachment",
  "email_action_button",
  "chat_reply_option",
  "chat_choice_message",
  "dashboard_action_card",
  "dashboard_flag_toggle",
  "dashboard_review_item",
] as const;
export type ShellInteractionType = (typeof SHELL_INTERACTION_TYPES)[number];

export { SCENARIO_STATE_TYPES };
export type {
  ScenarioStateCondition,
  ScenarioStateRoute,
  ScenarioStateUpdate,
  ScenarioStateValue,
  ScenarioStateVariableDefinition,
};

export const SCENE_COMPONENT_SLOTS = [
  "main",
  "left",
  "right",
  "footer",
  "header",
  "sidebar",
] as const;
export type SceneComponentSlot = (typeof SCENE_COMPONENT_SLOTS)[number];

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
  visibleWhen: ScenarioStateCondition[] | null;
}

export interface CompiledLayoutColumn {
  title: string;
  text: string;
  image: string | null;
  video: string | null;
}

export interface CompiledEmailShell {
  from: string;
  subject: string;
  previewText: string;
  attachments: string[];
  warningBanner: string;
  warningBannerVisibleWhen: ScenarioStateCondition[] | null;
}

export interface CompiledChatMessage {
  sender: string;
  text: string;
  timestamp: string;
  role: "self" | "other";
  visibleWhen: ScenarioStateCondition[] | null;
}

export interface CompiledChatShell {
  title: string;
  systemNotice: string;
  systemNoticeVisibleWhen: ScenarioStateCondition[] | null;
  messages: CompiledChatMessage[];
}

export interface CompiledDashboardCard {
  title: string;
  text: string;
  metricLabel: string;
  metricValue: string;
  status: "neutral" | "warning" | "positive" | "danger";
  visibleWhen: ScenarioStateCondition[] | null;
}

export interface CompiledDashboardShell {
  title: string;
  navItems: string[];
  notice: string;
  noticeVisibleWhen: ScenarioStateCondition[] | null;
  cards: CompiledDashboardCard[];
}

interface BaseSceneComponent<Type extends SceneComponentType> {
  id: string;
  type: Type;
  slot: SceneComponentSlot;
  visibleWhen?: ScenarioStateCondition[] | null;
}

export interface SceneTitleComponent extends BaseSceneComponent<"title"> {
  text: string;
  level: 1 | 2 | 3;
}

export interface SceneParagraphComponent
  extends BaseSceneComponent<"paragraph"> {
  text: string;
  tone: "body" | "muted";
}

export interface SceneImageComponent extends BaseSceneComponent<"image"> {
  mediaType: "image" | "video";
  src: string;
  alt: string;
  caption: string;
}

export interface SceneCalloutComponent extends BaseSceneComponent<"callout"> {
  title: string;
  text: string;
  variant: "info" | "warning" | "success";
}

export interface SceneButtonComponent extends BaseSceneComponent<"button"> {
  label: string;
  variant: "primary" | "secondary";
  actionId: string | null;
  disabled: boolean;
}

export interface SceneQuestionBlockComponent
  extends BaseSceneComponent<"question_block"> {
  prompt: string;
  multiple: boolean;
  helperText: string;
}

export interface SceneResultCardComponent
  extends BaseSceneComponent<"result_card"> {
  outcome: "passed" | "failed" | "neutral";
  summary: string;
}

export interface SceneQuoteComponent extends BaseSceneComponent<"quote"> {
  text: string;
  attribution: string;
}

export interface SceneDividerComponent extends BaseSceneComponent<"divider"> {
  label: string;
}

export interface SceneListComponent extends BaseSceneComponent<"list"> {
  items: string[];
  ordered: boolean;
}

export interface SceneEmailHeaderComponent
  extends BaseSceneComponent<"email_header"> {
  from: string;
  subject: string;
  previewText: string;
}

export interface SceneEmailBodyComponent extends BaseSceneComponent<"email_body"> {
  text: string;
}

export interface SceneEmailAttachmentListComponent
  extends BaseSceneComponent<"email_attachment_list"> {
  attachments: string[];
}

export interface SceneEmailWarningBannerComponent
  extends BaseSceneComponent<"email_warning_banner"> {
  text: string;
  severity: "warning" | "info";
}

export interface SceneChatMessageComponent
  extends BaseSceneComponent<"chat_message"> {
  sender: string;
  text: string;
  timestamp: string;
  role: "self" | "other";
}

export interface SceneChatSystemNoticeComponent
  extends BaseSceneComponent<"chat_system_notice"> {
  text: string;
}

export interface SceneCardComponent extends BaseSceneComponent<"card"> {
  title: string;
  text: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface SceneMetricComponent extends BaseSceneComponent<"metric"> {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "positive" | "danger";
}

export interface SceneStatusBadgeComponent
  extends BaseSceneComponent<"status_badge"> {
  label: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface ScenePanelTitleComponent
  extends BaseSceneComponent<"panel_title"> {
  text: string;
}

export interface SceneDashboardNoticeComponent
  extends BaseSceneComponent<"dashboard_notice"> {
  title: string;
  text: string;
  variant: "info" | "warning" | "success";
}

interface BaseSceneInteractiveComponent<Type extends SceneComponentType>
  extends BaseSceneComponent<Type> {
  optionId: string;
  actionMode: "trigger" | "toggle";
  feedback: string;
  correct: boolean | null;
  scoreDelta: number | null;
  nextNodeId: string | null;
}

export interface SceneEmailLinkComponent
  extends BaseSceneInteractiveComponent<"email_link"> {
  label: string;
  hrefLabel: string;
}

export interface SceneEmailAttachmentComponent
  extends BaseSceneInteractiveComponent<"email_attachment"> {
  label: string;
  fileName: string;
}

export interface SceneEmailActionButtonComponent
  extends BaseSceneInteractiveComponent<"email_action_button"> {
  label: string;
  variant: "primary" | "secondary";
}

export interface SceneChatReplyOptionComponent
  extends BaseSceneInteractiveComponent<"chat_reply_option"> {
  label: string;
}

export interface SceneChatChoiceMessageComponent
  extends BaseSceneInteractiveComponent<"chat_choice_message"> {
  sender: string;
  text: string;
  timestamp: string;
  role: "self" | "other";
}

export interface SceneDashboardActionCardComponent
  extends BaseSceneInteractiveComponent<"dashboard_action_card"> {
  title: string;
  text: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface SceneDashboardFlagToggleComponent
  extends BaseSceneInteractiveComponent<"dashboard_flag_toggle"> {
  label: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface SceneDashboardReviewItemComponent
  extends BaseSceneInteractiveComponent<"dashboard_review_item"> {
  title: string;
  text: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export type CompiledSceneComponent =
  | SceneTitleComponent
  | SceneParagraphComponent
  | SceneImageComponent
  | SceneCalloutComponent
  | SceneButtonComponent
  | SceneQuestionBlockComponent
  | SceneResultCardComponent
  | SceneQuoteComponent
  | SceneDividerComponent
  | SceneListComponent
  | SceneEmailHeaderComponent
  | SceneEmailBodyComponent
  | SceneEmailAttachmentListComponent
  | SceneEmailWarningBannerComponent
  | SceneChatMessageComponent
  | SceneChatSystemNoticeComponent
  | SceneCardComponent
  | SceneMetricComponent
  | SceneStatusBadgeComponent
  | ScenePanelTitleComponent
  | SceneDashboardNoticeComponent
  | SceneEmailLinkComponent
  | SceneEmailAttachmentComponent
  | SceneEmailActionButtonComponent
  | SceneChatReplyOptionComponent
  | SceneChatChoiceMessageComponent
  | SceneDashboardActionCardComponent
  | SceneDashboardFlagToggleComponent
  | SceneDashboardReviewItemComponent;

export interface CompiledSceneMetadata {
  sourceLayout: CourseLayoutType | null;
  sourceNodeType: CourseNodeType;
  sourceAuthorType: CourseAuthorNodeType;
  renderedFromLegacy: boolean;
  mediaPlacement: "left" | "right" | "main" | null;
}

export interface CompiledScene {
  id: string;
  layout: SceneLayoutShell;
  components: CompiledSceneComponent[];
  metadata: CompiledSceneMetadata;
}

export interface CompiledEdge {
  from: string;
  to: string;
  label: string;
}

interface BaseCompiledShellInteraction<Type extends ShellInteractionType> {
  id: string;
  type: Type;
  optionId: string;
  feedback: string;
  visibleWhen?: ScenarioStateCondition[] | null;
}

export interface CompiledEmailLinkInteraction
  extends BaseCompiledShellInteraction<"email_link"> {
  label: string;
  hrefLabel: string;
}

export interface CompiledEmailAttachmentInteraction
  extends BaseCompiledShellInteraction<"email_attachment"> {
  label: string;
  fileName: string;
}

export interface CompiledEmailActionButtonInteraction
  extends BaseCompiledShellInteraction<"email_action_button"> {
  label: string;
  variant: "primary" | "secondary";
}

export interface CompiledChatReplyOptionInteraction
  extends BaseCompiledShellInteraction<"chat_reply_option"> {
  label: string;
}

export interface CompiledChatChoiceMessageInteraction
  extends BaseCompiledShellInteraction<"chat_choice_message"> {
  sender: string;
  text: string;
  timestamp: string;
  role: "self" | "other";
}

export interface CompiledDashboardActionCardInteraction
  extends BaseCompiledShellInteraction<"dashboard_action_card"> {
  title: string;
  text: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface CompiledDashboardFlagToggleInteraction
  extends BaseCompiledShellInteraction<"dashboard_flag_toggle"> {
  label: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export interface CompiledDashboardReviewItemInteraction
  extends BaseCompiledShellInteraction<"dashboard_review_item"> {
  title: string;
  text: string;
  status: "neutral" | "warning" | "positive" | "danger";
}

export type CompiledShellInteraction =
  | CompiledEmailLinkInteraction
  | CompiledEmailAttachmentInteraction
  | CompiledEmailActionButtonInteraction
  | CompiledChatReplyOptionInteraction
  | CompiledChatChoiceMessageInteraction
  | CompiledDashboardActionCardInteraction
  | CompiledDashboardFlagToggleInteraction
  | CompiledDashboardReviewItemInteraction;

interface BaseCompiledNode {
  id: string;
  type: CourseNodeType;
  sourceType: CourseAuthorNodeType;
  title: string;
  body: string;
  layout: CourseLayoutType | null;
  shell: AuthorSceneShell | null;
  media: CompiledMedia | null;
  left: CompiledLayoutColumn | null;
  right: CompiledLayoutColumn | null;
  quote: CompiledQuoteBlock | null;
  callout: CompiledCalloutBlock | null;
  emailShell: CompiledEmailShell | null;
  chatShell: CompiledChatShell | null;
  dashboardShell: CompiledDashboardShell | null;
  interactions: CompiledShellInteraction[];
  scene: CompiledScene;
}

export interface CompiledContentNode extends BaseCompiledNode {
  type: "content";
  sourceType: "content";
  next: string | null;
  nextWhen: ScenarioStateRoute[];
}

export interface CompiledChoiceOption {
  id: string;
  label: string;
  next: string;
  nextWhen: ScenarioStateRoute[];
  score: number;
  feedback: string;
  stateUpdates: ScenarioStateUpdate[];
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
  feedback: string;
  stateUpdates: ScenarioStateUpdate[];
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
  passNextWhen: ScenarioStateRoute[];
  failNext: string | null;
  failNextWhen: ScenarioStateRoute[];
  next: string | null;
  nextWhen: ScenarioStateRoute[];
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
  scenarioState: Record<string, ScenarioStateVariableDefinition>;
  scenarioStateOrder: string[];
  startNodeId: string;
  passingScore: number;
  maxScore: number;
  nodeOrder: string[];
  edges: CompiledEdge[];
  nodes: Record<string, CompiledNode>;
}

export type CanonicalCourse = CompiledCourse;
export type CanonicalNode = CompiledNode;
