import { z } from "zod";

import { COURSE_LAYOUT_TYPES, type CourseLayoutType } from "@/lib/course/types";

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

export interface QuoteBlockDocument {
  text: string;
  attribution?: string;
}

export interface CalloutBlockDocument {
  title?: string;
  text: string;
}

export interface LayoutColumnDocument {
  title?: string;
  text?: string;
  image?: string;
  video?: string;
}

export interface ChoiceOptionDocument {
  id: string;
  label: string;
  next: string;
  score: number;
}

export interface QuizOptionDocument {
  id: string;
  label: string;
  correct: boolean;
}

interface BaseNodeDocument {
  id: string;
  title: string;
  body?: string;
  layout?: CourseLayoutType;
  media?: MediaDocument;
  left?: LayoutColumnDocument;
  right?: LayoutColumnDocument;
  quote?: QuoteBlockDocument;
  callout?: CalloutBlockDocument;
}

export interface ContentNodeDocument extends BaseNodeDocument {
  type: "content";
  next?: string;
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
  failNext?: string;
  next?: string;
}

export interface QuestionNodeDocument extends BaseNodeDocument {
  type: "question";
  prompt: string;
  multiple?: boolean;
  options: QuizOptionDocument[];
  correctScore?: number;
  incorrectScore?: number;
  passNext?: string;
  failNext?: string;
  next?: string;
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
}

export interface TemplateLayoutColumnDocument {
  title?: string;
  text?: TemplateTextValue;
  image?: string;
  video?: string;
}

interface BaseTemplateNodeDocument {
  id: string;
  title: string;
  body?: TemplateTextValue;
  layout?: CourseLayoutType;
  media?: TemplateMediaDocument;
  left?: TemplateLayoutColumnDocument;
  right?: TemplateLayoutColumnDocument;
  quote?: TemplateQuoteBlockDocument;
  callout?: TemplateCalloutBlockDocument;
}

export interface TemplateChoiceOptionDocument {
  id: string;
  label: string;
  next: string;
  score?: string | number;
}

export interface TemplateQuizOptionDocument {
  id: string;
  label: string;
  correct: boolean;
}

export interface TemplateContentNodeDocument extends BaseTemplateNodeDocument {
  type: "content";
  next?: string;
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
  failNext?: string;
  next?: string;
}

export interface TemplateQuestionNodeDocument extends BaseTemplateNodeDocument {
  type: "question";
  prompt: string;
  multiple?: boolean;
  options: TemplateQuizOptionDocument[];
  correctScore?: string | number;
  incorrectScore?: string | number;
  passNext?: string;
  failNext?: string;
  next?: string;
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

const choiceOptionSchema = z
  .object({
    id: identifierSchema,
    label: templateStringSchema,
    next: identifierSchema,
    score: numberSchema.default(0),
  })
  .strict();

const quizOptionSchema = z
  .object({
    id: identifierSchema,
    label: templateStringSchema,
    correct: z.boolean(),
  })
  .strict();

const presentationSchema = {
  layout: layoutTypeSchema.optional(),
  media: mediaSchema.optional(),
  left: layoutColumnSchema.optional(),
  right: layoutColumnSchema.optional(),
  quote: quoteSchema.optional(),
  callout: calloutSchema.optional(),
} as const;

const contentNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("content"),
    title: templateStringSchema,
    body: z.string().optional(),
    next: identifierSchema.optional(),
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
    failNext: identifierSchema.optional(),
    next: identifierSchema.optional(),
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
    failNext: identifierSchema.optional(),
    next: identifierSchema.optional(),
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

const templatePresentationSchema = {
  layout: layoutTypeSchema.optional(),
  media: templateMediaSchema.optional(),
  left: templateLayoutColumnSchema.optional(),
  right: templateLayoutColumnSchema.optional(),
  quote: templateQuoteSchema.optional(),
  callout: templateCalloutSchema.optional(),
} as const;

const templateChoiceOptionSchema = z
  .object({
    id: templateStringSchema,
    label: templateStringSchema,
    next: templateStringSchema,
    score: templateNumberSchema.default(0),
  })
  .strict();

const templateQuizOptionSchema = z
  .object({
    id: templateStringSchema,
    label: templateStringSchema,
    correct: z.boolean(),
  })
  .strict();

const templateContentNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("content"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    next: templateStringSchema.optional(),
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
    failNext: templateStringSchema.optional(),
    next: templateStringSchema.optional(),
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
    failNext: templateStringSchema.optional(),
    next: templateStringSchema.optional(),
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
