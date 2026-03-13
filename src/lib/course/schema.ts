import { z } from "zod";

import {
  AUTHOR_SCENE_SHELLS,
  COURSE_LAYOUT_TYPES,
  SCENARIO_STATE_TYPES,
  type AuthorSceneShell,
  type CourseLayoutType,
} from "@/lib/course/types";

export type TemplateScalarValue = string | number | boolean;

export interface ThemeDocument {
  primary?: string;
  secondary?: string;
  font?: string;
  logo?: string;
  background?: string;
}

export interface BlockIncludeDocument {
  include: string;
}

export interface ModuleIncludeReferenceDocument {
  module: string;
  version?: string;
  with?: Record<string, TemplateScalarValue>;
}

export interface ModuleIncludeDocument {
  include: ModuleIncludeReferenceDocument;
}

export interface MediaDocument {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
}

export interface ScenarioStateVariableDocument {
  type: "boolean" | "number" | "string" | "enum";
  initial: TemplateScalarValue;
  description?: string;
  options?: string[];
}

export interface ScenarioStateConditionDocument {
  variable: string;
  equals?: TemplateScalarValue;
  notEquals?: TemplateScalarValue;
  oneOf?: TemplateScalarValue[];
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface ScenarioStateRouteDocument {
  when: ScenarioStateConditionDocument[];
  next: string;
}

export interface ScenarioStateUpdateDocument {
  variable: string;
  set?: TemplateScalarValue;
  increment?: number;
  decrement?: number;
}

export interface QuoteBlockDocument {
  text: string;
  attribution?: string;
}

export interface CalloutBlockDocument {
  title?: string;
  text: string;
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface LayoutColumnDocument {
  title?: string;
  text?: string;
  image?: string;
  video?: string;
}

export interface EmailShellDocument {
  from: string;
  subject: string;
  previewText?: string;
  attachments?: string[];
  warningBanner?: string;
  warningBannerVisibleIf?: ScenarioStateConditionDocument[];
}

export interface ChatMessageDocument {
  sender: string;
  text: string;
  timestamp?: string;
  role?: "self" | "other";
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface ChatShellDocument {
  title?: string;
  systemNotice?: string;
  systemNoticeVisibleIf?: ScenarioStateConditionDocument[];
  messages: ChatMessageDocument[];
}

export interface DashboardCardDocument {
  title: string;
  text?: string;
  metricLabel?: string;
  metricValue?: string;
  status?: "neutral" | "warning" | "positive" | "danger";
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface DashboardShellDocument {
  title?: string;
  navItems?: string[];
  notice?: string;
  noticeVisibleIf?: ScenarioStateConditionDocument[];
  cards?: DashboardCardDocument[];
}

interface BaseShellInteractionDocument {
  id: string;
  optionId: string;
  feedback?: string;
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface EmailLinkInteractionDocument extends BaseShellInteractionDocument {
  type: "email_link";
  label: string;
  hrefLabel?: string;
}

export interface EmailAttachmentInteractionDocument
  extends BaseShellInteractionDocument {
  type: "email_attachment";
  label: string;
  fileName?: string;
}

export interface EmailActionButtonInteractionDocument
  extends BaseShellInteractionDocument {
  type: "email_action_button";
  label: string;
  variant?: "primary" | "secondary";
}

export interface ChatReplyOptionInteractionDocument
  extends BaseShellInteractionDocument {
  type: "chat_reply_option";
  label: string;
}

export interface ChatChoiceMessageInteractionDocument
  extends BaseShellInteractionDocument {
  type: "chat_choice_message";
  sender: string;
  text: string;
  timestamp?: string;
  role?: "self" | "other";
}

export interface DashboardActionCardInteractionDocument
  extends BaseShellInteractionDocument {
  type: "dashboard_action_card";
  title: string;
  text?: string;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export interface DashboardFlagToggleInteractionDocument
  extends BaseShellInteractionDocument {
  type: "dashboard_flag_toggle";
  label: string;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export interface DashboardReviewItemInteractionDocument
  extends BaseShellInteractionDocument {
  type: "dashboard_review_item";
  title: string;
  text?: string;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export type ShellInteractionDocument =
  | EmailLinkInteractionDocument
  | EmailAttachmentInteractionDocument
  | EmailActionButtonInteractionDocument
  | ChatReplyOptionInteractionDocument
  | ChatChoiceMessageInteractionDocument
  | DashboardActionCardInteractionDocument
  | DashboardFlagToggleInteractionDocument
  | DashboardReviewItemInteractionDocument;

export interface ChoiceOptionDocument {
  id: string;
  label: string;
  next: string;
  score: number;
  feedback?: string;
  stateUpdates?: ScenarioStateUpdateDocument[];
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface QuizOptionDocument {
  id: string;
  label: string;
  correct: boolean;
  feedback?: string;
  stateUpdates?: ScenarioStateUpdateDocument[];
}

interface BaseNodeDocument {
  id: string;
  title: string;
  body?: string;
  layout?: CourseLayoutType;
  shell?: AuthorSceneShell;
  media?: MediaDocument;
  left?: LayoutColumnDocument;
  right?: LayoutColumnDocument;
  quote?: QuoteBlockDocument;
  callout?: CalloutBlockDocument;
  email?: EmailShellDocument;
  chat?: ChatShellDocument;
  dashboard?: DashboardShellDocument;
  interactions?: ShellInteractionDocument[];
}

export interface ContentNodeDocument extends BaseNodeDocument {
  type: "content";
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface ChoiceNodeDocument extends BaseNodeDocument {
  type: "choice";
  options: ChoiceOptionDocument[];
}

export interface BranchNodeDocument extends BaseNodeDocument {
  type: "branch";
  options: ChoiceOptionDocument[];
}

export interface QuizNodeDocument extends BaseNodeDocument {
  type: "quiz";
  question: string;
  multiple?: boolean;
  options: QuizOptionDocument[];
  correctScore?: number;
  incorrectScore?: number;
  passNext?: string;
  passNextWhen?: ScenarioStateRouteDocument[];
  failNext?: string;
  failNextWhen?: ScenarioStateRouteDocument[];
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface QuestionNodeDocument extends BaseNodeDocument {
  type: "question";
  prompt: string;
  multiple?: boolean;
  options: QuizOptionDocument[];
  correctScore?: number;
  incorrectScore?: number;
  passNext?: string;
  passNextWhen?: ScenarioStateRouteDocument[];
  failNext?: string;
  failNextWhen?: ScenarioStateRouteDocument[];
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface ResultNodeDocument extends BaseNodeDocument {
  type: "result";
  outcome?: "passed" | "failed" | "neutral";
}

export type CourseDocumentNode =
  | ContentNodeDocument
  | ChoiceNodeDocument
  | BranchNodeDocument
  | QuizNodeDocument
  | QuestionNodeDocument
  | ResultNodeDocument;

export interface CourseDocument {
  id: string;
  title: string;
  description: string;
  theme?: ThemeDocument;
  state?: Record<string, ScenarioStateVariableDocument>;
  start: string;
  passingScore: number;
  nodes: CourseDocumentNode[];
}

export type TemplateTextValue = string | string[];

export interface TemplateMediaDocument {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: TemplateTextValue;
}

export interface TemplateQuoteBlockDocument {
  text: TemplateTextValue;
  attribution?: string;
}

export interface TemplateCalloutBlockDocument {
  title?: string;
  text: TemplateTextValue;
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface TemplateLayoutColumnDocument {
  title?: string;
  text?: TemplateTextValue;
  image?: string;
  video?: string;
}

export interface TemplateEmailShellDocument {
  from: string;
  subject: string;
  previewText?: string;
  attachments?: string[];
  warningBanner?: TemplateTextValue;
  warningBannerVisibleIf?: ScenarioStateConditionDocument[];
}

export interface TemplateChatMessageDocument {
  sender: string;
  text: string;
  timestamp?: string;
  role?: "self" | "other";
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface TemplateChatShellDocument {
  title?: string;
  systemNotice?: TemplateTextValue;
  systemNoticeVisibleIf?: ScenarioStateConditionDocument[];
  messages: TemplateChatMessageDocument[];
}

export interface TemplateDashboardCardDocument {
  title: string;
  text?: TemplateTextValue;
  metricLabel?: string;
  metricValue?: string;
  status?: "neutral" | "warning" | "positive" | "danger";
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface TemplateDashboardShellDocument {
  title?: string;
  navItems?: string[];
  notice?: TemplateTextValue;
  noticeVisibleIf?: ScenarioStateConditionDocument[];
  cards?: TemplateDashboardCardDocument[];
}

interface BaseTemplateShellInteractionDocument {
  id: string;
  optionId: string;
  feedback?: TemplateTextValue;
  visibleIf?: ScenarioStateConditionDocument[];
}

export interface TemplateEmailLinkInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "email_link";
  label: string;
  hrefLabel?: string;
}

export interface TemplateEmailAttachmentInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "email_attachment";
  label: string;
  fileName?: string;
}

export interface TemplateEmailActionButtonInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "email_action_button";
  label: string;
  variant?: "primary" | "secondary";
}

export interface TemplateChatReplyOptionInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "chat_reply_option";
  label: string;
}

export interface TemplateChatChoiceMessageInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "chat_choice_message";
  sender: string;
  text: string;
  timestamp?: string;
  role?: "self" | "other";
}

export interface TemplateDashboardActionCardInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "dashboard_action_card";
  title: string;
  text?: TemplateTextValue;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export interface TemplateDashboardFlagToggleInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "dashboard_flag_toggle";
  label: string;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export interface TemplateDashboardReviewItemInteractionDocument
  extends BaseTemplateShellInteractionDocument {
  type: "dashboard_review_item";
  title: string;
  text?: TemplateTextValue;
  status?: "neutral" | "warning" | "positive" | "danger";
}

export type TemplateShellInteractionDocument =
  | TemplateEmailLinkInteractionDocument
  | TemplateEmailAttachmentInteractionDocument
  | TemplateEmailActionButtonInteractionDocument
  | TemplateChatReplyOptionInteractionDocument
  | TemplateChatChoiceMessageInteractionDocument
  | TemplateDashboardActionCardInteractionDocument
  | TemplateDashboardFlagToggleInteractionDocument
  | TemplateDashboardReviewItemInteractionDocument;

interface BaseTemplateNodeDocument {
  id: string;
  title: string;
  body?: TemplateTextValue;
  layout?: CourseLayoutType;
  shell?: AuthorSceneShell;
  media?: TemplateMediaDocument;
  left?: TemplateLayoutColumnDocument;
  right?: TemplateLayoutColumnDocument;
  quote?: TemplateQuoteBlockDocument;
  callout?: TemplateCalloutBlockDocument;
  email?: TemplateEmailShellDocument;
  chat?: TemplateChatShellDocument;
  dashboard?: TemplateDashboardShellDocument;
  interactions?: TemplateShellInteractionDocument[];
}

export interface TemplateChoiceOptionDocument {
  id: string;
  label: string;
  next: string;
  score?: string | number;
  feedback?: TemplateTextValue;
  stateUpdates?: ScenarioStateUpdateDocument[];
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface TemplateQuizOptionDocument {
  id: string;
  label: string;
  correct: boolean;
  feedback?: TemplateTextValue;
  stateUpdates?: ScenarioStateUpdateDocument[];
}

export interface TemplateContentNodeDocument extends BaseTemplateNodeDocument {
  type: "content";
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface TemplateChoiceNodeDocument extends BaseTemplateNodeDocument {
  type: "choice";
  options: TemplateChoiceOptionDocument[];
}

export interface TemplateBranchNodeDocument extends BaseTemplateNodeDocument {
  type: "branch";
  options: TemplateChoiceOptionDocument[];
}

export interface TemplateQuizNodeDocument extends BaseTemplateNodeDocument {
  type: "quiz";
  question: string;
  multiple?: boolean;
  options: TemplateQuizOptionDocument[];
  correctScore?: string | number;
  incorrectScore?: string | number;
  passNext?: string;
  passNextWhen?: ScenarioStateRouteDocument[];
  failNext?: string;
  failNextWhen?: ScenarioStateRouteDocument[];
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface TemplateQuestionNodeDocument extends BaseTemplateNodeDocument {
  type: "question";
  prompt: string;
  multiple?: boolean;
  options: TemplateQuizOptionDocument[];
  correctScore?: string | number;
  incorrectScore?: string | number;
  passNext?: string;
  passNextWhen?: ScenarioStateRouteDocument[];
  failNext?: string;
  failNextWhen?: ScenarioStateRouteDocument[];
  next?: string;
  nextWhen?: ScenarioStateRouteDocument[];
}

export interface TemplateResultNodeDocument extends BaseTemplateNodeDocument {
  type: "result";
  outcome?: "passed" | "failed" | "neutral";
}

export type CourseTemplateNodeDocument =
  | TemplateContentNodeDocument
  | TemplateChoiceNodeDocument
  | TemplateBranchNodeDocument
  | TemplateQuizNodeDocument
  | TemplateQuestionNodeDocument
  | TemplateResultNodeDocument;

export type CourseTemplateEntryDocument =
  | CourseTemplateNodeDocument
  | BlockIncludeDocument
  | ModuleIncludeDocument;

export interface CourseTemplateDocument {
  id: string;
  title: string;
  description?: string;
  theme?: ThemeDocument;
  state?: Record<string, ScenarioStateVariableDocument>;
  start: string;
  passingScore?: string | number;
  templateData?: Record<string, TemplateScalarValue>;
  blocks?: Record<string, CourseTemplateEntryDocument[]>;
  nodes: CourseTemplateEntryDocument[];
}

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Value is required.")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Use letters, numbers, hyphens, or underscores only."
  );

const templateStringSchema = z.string().trim().min(1, "Value is required.");
const textBlockSchema = z.union([
  z.string(),
  z.array(z.string()).min(1, "At least one line is required."),
]);
const templateNumberSchema = z.union([z.number(), z.string().trim().min(1)]);
const numberSchema = z.coerce
  .number()
  .refine(Number.isFinite, "Expected a finite number.");

const layoutTypeSchema = z.enum(COURSE_LAYOUT_TYPES);
const sceneShellSchema = z.enum(AUTHOR_SCENE_SHELLS);
const scenarioStateTypeSchema = z.enum(SCENARIO_STATE_TYPES);
const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);

const scenarioStateConditionSchema = z
  .object({
    variable: identifierSchema,
    equals: scalarSchema.optional(),
    notEquals: scalarSchema.optional(),
    oneOf: z.array(scalarSchema).min(1).optional(),
    gt: numberSchema.optional(),
    gte: numberSchema.optional(),
    lt: numberSchema.optional(),
    lte: numberSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.equals !== undefined ||
      value.notEquals !== undefined ||
      value.oneOf !== undefined ||
      value.gt !== undefined ||
      value.gte !== undefined ||
      value.lt !== undefined ||
      value.lte !== undefined,
    {
      message:
        'Add at least one condition check such as "equals", "notEquals", or "gte".',
    }
  );

const scenarioStateRouteSchema = z
  .object({
    when: z
      .array(scenarioStateConditionSchema)
      .min(1, "Add at least one condition to a conditional route."),
    next: identifierSchema,
  })
  .strict();

const scenarioStateUpdateSchema = z
  .object({
    variable: identifierSchema,
    set: scalarSchema.optional(),
    increment: numberSchema.optional(),
    decrement: numberSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.set, value.increment, value.decrement].filter(
        (candidate) => candidate !== undefined
      ).length === 1,
    {
      message:
        'Use exactly one state update operation: "set", "increment", or "decrement".',
    }
  );

const scenarioStateVariableSchema = z
  .object({
    type: scenarioStateTypeSchema,
    initial: scalarSchema,
    description: z.string().optional(),
    options: z.array(templateStringSchema).optional(),
  })
  .strict();

const themeSchema = z
  .object({
    primary: z.string().trim().min(1).optional(),
    secondary: z.string().trim().min(1).optional(),
    font: z.string().trim().min(1).optional(),
    logo: z.string().trim().min(1).optional(),
    background: z.string().trim().min(1).optional(),
  })
  .strict();

const mediaSchema = z
  .object({
    type: z.enum(["image", "video"]),
    src: templateStringSchema,
    alt: z.string().optional(),
    caption: z.string().optional(),
  })
  .strict();

const quoteSchema = z
  .object({
    text: templateStringSchema,
    attribution: z.string().optional(),
  })
  .strict();

const calloutSchema = z
  .object({
    title: z.string().optional(),
    text: templateStringSchema,
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const layoutColumnSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    image: z.string().optional(),
    video: z.string().optional(),
  })
  .strict();

const emailShellSchema = z
  .object({
    from: templateStringSchema,
    subject: templateStringSchema,
    previewText: z.string().optional(),
    attachments: z.array(templateStringSchema).optional(),
    warningBanner: z.string().optional(),
    warningBannerVisibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const chatMessageSchema = z
  .object({
    sender: templateStringSchema,
    text: templateStringSchema,
    timestamp: z.string().optional(),
    role: z.enum(["self", "other"]).optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const chatShellSchema = z
  .object({
    title: z.string().optional(),
    systemNotice: z.string().optional(),
    systemNoticeVisibleIf: z.array(scenarioStateConditionSchema).optional(),
    messages: z.array(chatMessageSchema).min(1, "At least one chat message is required."),
  })
  .strict();

const dashboardCardSchema = z
  .object({
    title: templateStringSchema,
    text: z.string().optional(),
    metricLabel: z.string().optional(),
    metricValue: z.string().optional(),
    status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const dashboardShellSchema = z
  .object({
    title: z.string().optional(),
    navItems: z.array(templateStringSchema).optional(),
    notice: z.string().optional(),
    noticeVisibleIf: z.array(scenarioStateConditionSchema).optional(),
    cards: z.array(dashboardCardSchema).optional(),
  })
  .strict();

const feedbackTextSchema = z.union([z.string(), z.array(z.string()).min(1)]);

const emailLinkInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("email_link"),
    optionId: identifierSchema,
    label: templateStringSchema,
    hrefLabel: z.string().optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const emailAttachmentInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("email_attachment"),
    optionId: identifierSchema,
    label: templateStringSchema,
    fileName: z.string().optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const emailActionButtonInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("email_action_button"),
    optionId: identifierSchema,
    label: templateStringSchema,
    variant: z.enum(["primary", "secondary"]).optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const chatReplyOptionInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("chat_reply_option"),
    optionId: identifierSchema,
    label: templateStringSchema,
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const chatChoiceMessageInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("chat_choice_message"),
    optionId: identifierSchema,
    sender: templateStringSchema,
    text: templateStringSchema,
    timestamp: z.string().optional(),
    role: z.enum(["self", "other"]).optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const dashboardActionCardInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("dashboard_action_card"),
    optionId: identifierSchema,
    title: templateStringSchema,
    text: z.string().optional(),
    status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const dashboardFlagToggleInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("dashboard_flag_toggle"),
    optionId: identifierSchema,
    label: templateStringSchema,
    status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const dashboardReviewItemInteractionSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("dashboard_review_item"),
    optionId: identifierSchema,
    title: templateStringSchema,
    text: z.string().optional(),
    status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
    feedback: z.string().optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const shellInteractionSchema = z.discriminatedUnion("type", [
  emailLinkInteractionSchema,
  emailAttachmentInteractionSchema,
  emailActionButtonInteractionSchema,
  chatReplyOptionInteractionSchema,
  chatChoiceMessageInteractionSchema,
  dashboardActionCardInteractionSchema,
  dashboardFlagToggleInteractionSchema,
  dashboardReviewItemInteractionSchema,
]);

const choiceOptionSchema = z
  .object({
    id: identifierSchema,
    label: templateStringSchema,
    next: identifierSchema,
    score: numberSchema.default(0),
    feedback: z.string().optional(),
    stateUpdates: z.array(scenarioStateUpdateSchema).optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
  })
  .strict();

const quizOptionSchema = z
  .object({
    id: identifierSchema,
    label: templateStringSchema,
    correct: z.boolean(),
    feedback: z.string().optional(),
    stateUpdates: z.array(scenarioStateUpdateSchema).optional(),
  })
  .strict();

const presentationSchema = {
  layout: layoutTypeSchema.optional(),
  shell: sceneShellSchema.optional(),
  media: mediaSchema.optional(),
  left: layoutColumnSchema.optional(),
  right: layoutColumnSchema.optional(),
  quote: quoteSchema.optional(),
  callout: calloutSchema.optional(),
  email: emailShellSchema.optional(),
  chat: chatShellSchema.optional(),
  dashboard: dashboardShellSchema.optional(),
  interactions: z.array(shellInteractionSchema).optional(),
} as const;

const contentNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("content"),
    title: templateStringSchema,
    body: z.string().optional(),
    next: identifierSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...presentationSchema,
  })
  .strict();

const choiceNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("choice"),
    title: templateStringSchema,
    body: z.string().optional(),
    options: z.array(choiceOptionSchema).min(1, "At least one option is required."),
    ...presentationSchema,
  })
  .strict();

const branchNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("branch"),
    title: templateStringSchema,
    body: z.string().optional(),
    options: z.array(choiceOptionSchema).min(1, "At least one option is required."),
    ...presentationSchema,
  })
  .strict();

const quizNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("quiz"),
    title: templateStringSchema,
    body: z.string().optional(),
    question: templateStringSchema,
    multiple: z.boolean().default(false),
    options: z.array(quizOptionSchema).min(2, "At least two options are required."),
    correctScore: numberSchema.default(10),
    incorrectScore: numberSchema.default(0),
    passNext: identifierSchema.optional(),
    passNextWhen: z.array(scenarioStateRouteSchema).optional(),
    failNext: identifierSchema.optional(),
    failNextWhen: z.array(scenarioStateRouteSchema).optional(),
    next: identifierSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...presentationSchema,
  })
  .strict();

const questionNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("question"),
    title: templateStringSchema,
    body: z.string().optional(),
    prompt: templateStringSchema,
    multiple: z.boolean().default(false),
    options: z.array(quizOptionSchema).min(2, "At least two options are required."),
    correctScore: numberSchema.default(10),
    incorrectScore: numberSchema.default(0),
    passNext: identifierSchema.optional(),
    passNextWhen: z.array(scenarioStateRouteSchema).optional(),
    failNext: identifierSchema.optional(),
    failNextWhen: z.array(scenarioStateRouteSchema).optional(),
    next: identifierSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...presentationSchema,
  })
  .strict();

const resultNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("result"),
    title: templateStringSchema,
    body: z.string().optional(),
    outcome: z.enum(["passed", "failed", "neutral"]).default("neutral"),
    ...presentationSchema,
  })
  .strict();

export const courseNodeSchema = z.discriminatedUnion("type", [
  contentNodeSchema,
  choiceNodeSchema,
  branchNodeSchema,
  quizNodeSchema,
  questionNodeSchema,
  resultNodeSchema,
]);

export const courseDocumentSchema = z
  .object({
    id: identifierSchema,
    title: templateStringSchema,
    description: z.string().optional().default(""),
    theme: themeSchema.optional(),
    state: z.record(identifierSchema, scenarioStateVariableSchema).optional().default({}),
    start: identifierSchema,
    passingScore: numberSchema.default(0),
    nodes: z.array(courseNodeSchema).min(1, "At least one node is required."),
  })
  .strict();

const templateMediaSchema = z
  .object({
    type: z.enum(["image", "video"]),
    src: templateStringSchema,
    alt: z.string().optional(),
    caption: textBlockSchema.optional(),
  })
  .strict();

const templateQuoteSchema = z
  .object({
    text: textBlockSchema,
    attribution: z.string().optional(),
  })
  .strict();

const templateCalloutSchema = z
  .object({
    title: z.string().optional(),
    text: textBlockSchema,
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const templateLayoutColumnSchema = z
  .object({
    title: z.string().optional(),
    text: textBlockSchema.optional(),
    image: z.string().optional(),
    video: z.string().optional(),
  })
  .strict();

const templateEmailShellSchema = z
  .object({
    from: templateStringSchema,
    subject: templateStringSchema,
    previewText: z.string().optional(),
    attachments: z.array(templateStringSchema).optional(),
    warningBanner: textBlockSchema.optional(),
    warningBannerVisibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const templateChatMessageSchema = z
  .object({
    sender: templateStringSchema,
    text: templateStringSchema,
    timestamp: z.string().optional(),
    role: z.enum(["self", "other"]).optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const templateChatShellSchema = z
  .object({
    title: z.string().optional(),
    systemNotice: textBlockSchema.optional(),
    systemNoticeVisibleIf: z.array(scenarioStateConditionSchema).optional(),
    messages: z
      .array(templateChatMessageSchema)
      .min(1, "At least one chat message is required."),
  })
  .strict();

const templateDashboardCardSchema = z
  .object({
    title: templateStringSchema,
    text: textBlockSchema.optional(),
    metricLabel: z.string().optional(),
    metricValue: z.string().optional(),
    status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
    visibleIf: z.array(scenarioStateConditionSchema).optional(),
  })
  .strict();

const templateDashboardShellSchema = z
  .object({
    title: z.string().optional(),
    navItems: z.array(templateStringSchema).optional(),
    notice: textBlockSchema.optional(),
    noticeVisibleIf: z.array(scenarioStateConditionSchema).optional(),
    cards: z.array(templateDashboardCardSchema).optional(),
  })
  .strict();

const templateShellInteractionSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: templateStringSchema,
      type: z.literal("email_link"),
      optionId: templateStringSchema,
      label: templateStringSchema,
      hrefLabel: z.string().optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("email_attachment"),
      optionId: templateStringSchema,
      label: templateStringSchema,
      fileName: z.string().optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("email_action_button"),
      optionId: templateStringSchema,
      label: templateStringSchema,
      variant: z.enum(["primary", "secondary"]).optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("chat_reply_option"),
      optionId: templateStringSchema,
      label: templateStringSchema,
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("chat_choice_message"),
      optionId: templateStringSchema,
      sender: templateStringSchema,
      text: templateStringSchema,
      timestamp: z.string().optional(),
      role: z.enum(["self", "other"]).optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("dashboard_action_card"),
      optionId: templateStringSchema,
      title: templateStringSchema,
      text: textBlockSchema.optional(),
      status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("dashboard_flag_toggle"),
      optionId: templateStringSchema,
      label: templateStringSchema,
      status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
  z
    .object({
      id: templateStringSchema,
      type: z.literal("dashboard_review_item"),
      optionId: templateStringSchema,
      title: templateStringSchema,
      text: textBlockSchema.optional(),
      status: z.enum(["neutral", "warning", "positive", "danger"]).optional(),
      feedback: textBlockSchema.optional(),
      visibleIf: z.array(scenarioStateConditionSchema).optional(),
    })
    .strict(),
]);

const templatePresentationSchema = {
  layout: layoutTypeSchema.optional(),
  shell: sceneShellSchema.optional(),
  media: templateMediaSchema.optional(),
  left: templateLayoutColumnSchema.optional(),
  right: templateLayoutColumnSchema.optional(),
  quote: templateQuoteSchema.optional(),
  callout: templateCalloutSchema.optional(),
  email: templateEmailShellSchema.optional(),
  chat: templateChatShellSchema.optional(),
  dashboard: templateDashboardShellSchema.optional(),
  interactions: z.array(templateShellInteractionSchema).optional(),
} as const;

const templateChoiceOptionSchema = z
  .object({
    id: templateStringSchema,
    label: templateStringSchema,
    next: templateStringSchema,
    score: templateNumberSchema.default(0),
    feedback: textBlockSchema.optional(),
    stateUpdates: z.array(scenarioStateUpdateSchema).optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
  })
  .strict();

const templateQuizOptionSchema = z
  .object({
    id: templateStringSchema,
    label: templateStringSchema,
    correct: z.boolean(),
    feedback: textBlockSchema.optional(),
    stateUpdates: z.array(scenarioStateUpdateSchema).optional(),
  })
  .strict();

const templateContentNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("content"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    next: templateStringSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...templatePresentationSchema,
  })
  .strict();

const templateChoiceNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("choice"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    options: z
      .array(templateChoiceOptionSchema)
      .min(1, "At least one option is required."),
    ...templatePresentationSchema,
  })
  .strict();

const templateBranchNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("branch"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    options: z
      .array(templateChoiceOptionSchema)
      .min(1, "At least one option is required."),
    ...templatePresentationSchema,
  })
  .strict();

const templateQuizNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("quiz"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    question: templateStringSchema,
    multiple: z.boolean().default(false),
    options: z
      .array(templateQuizOptionSchema)
      .min(2, "At least two options are required."),
    correctScore: templateNumberSchema.default(10),
    incorrectScore: templateNumberSchema.default(0),
    passNext: templateStringSchema.optional(),
    passNextWhen: z.array(scenarioStateRouteSchema).optional(),
    failNext: templateStringSchema.optional(),
    failNextWhen: z.array(scenarioStateRouteSchema).optional(),
    next: templateStringSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...templatePresentationSchema,
  })
  .strict();

const templateQuestionNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("question"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    prompt: templateStringSchema,
    multiple: z.boolean().default(false),
    options: z
      .array(templateQuizOptionSchema)
      .min(2, "At least two options are required."),
    correctScore: templateNumberSchema.default(10),
    incorrectScore: templateNumberSchema.default(0),
    passNext: templateStringSchema.optional(),
    passNextWhen: z.array(scenarioStateRouteSchema).optional(),
    failNext: templateStringSchema.optional(),
    failNextWhen: z.array(scenarioStateRouteSchema).optional(),
    next: templateStringSchema.optional(),
    nextWhen: z.array(scenarioStateRouteSchema).optional(),
    ...templatePresentationSchema,
  })
  .strict();

const templateResultNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("result"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    outcome: z.enum(["passed", "failed", "neutral"]).default("neutral"),
    ...templatePresentationSchema,
  })
  .strict();

export const courseTemplateNodeSchema = z.discriminatedUnion("type", [
  templateContentNodeSchema,
  templateChoiceNodeSchema,
  templateBranchNodeSchema,
  templateQuizNodeSchema,
  templateQuestionNodeSchema,
  templateResultNodeSchema,
]);

const blockIncludeSchema = z
  .object({
    include: identifierSchema,
  })
  .strict();

const moduleIncludeReferenceSchema = z
  .object({
    module: identifierSchema,
    version: z.string().trim().min(1).optional(),
    with: z
      .record(identifierSchema, z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .default({}),
  })
  .strict();

const moduleIncludeSchema = z
  .object({
    include: moduleIncludeReferenceSchema,
  })
  .strict();

const templateDataSchema = z.record(
  identifierSchema,
  z.union([z.string(), z.number(), z.boolean()])
);

export const courseTemplateEntrySchema: z.ZodType<CourseTemplateEntryDocument> =
  z.lazy(() =>
    z.union([courseTemplateNodeSchema, blockIncludeSchema, moduleIncludeSchema])
  );

export const courseTemplateDocumentSchema: z.ZodType<CourseTemplateDocument> = z
  .object({
    id: templateStringSchema,
    title: templateStringSchema,
    description: z.string().optional().default(""),
    theme: themeSchema.optional(),
    state: z.record(identifierSchema, scenarioStateVariableSchema).optional().default({}),
    start: templateStringSchema,
    passingScore: templateNumberSchema.default(0),
    templateData: templateDataSchema.optional().default({}),
    blocks: z
      .record(
        identifierSchema,
        z
          .array(courseTemplateEntrySchema)
          .min(1, "Each block must contain at least one entry.")
      )
      .optional()
      .default({}),
    nodes: z
      .array(courseTemplateEntrySchema)
      .min(1, "At least one node or block include is required."),
  })
  .strict();

export function isBlockIncludeEntry(
  entry: CourseTemplateEntryDocument
): entry is BlockIncludeDocument {
  return "include" in entry && typeof entry.include === "string";
}

export function isModuleIncludeEntry(
  entry: CourseTemplateEntryDocument
): entry is ModuleIncludeDocument {
  return "include" in entry && typeof entry.include === "object" && entry.include !== null;
}
