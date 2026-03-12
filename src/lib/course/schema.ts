import { z } from "zod";

export type TemplateScalarValue = string | number | boolean;

export interface BlockIncludeDocument {
  include: string;
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

export interface ContentNodeDocument {
  id: string;
  type: "content";
  title: string;
  body?: string;
  next?: string;
}

export interface ChoiceNodeDocument {
  id: string;
  type: "choice";
  title: string;
  body?: string;
  options: ChoiceOptionDocument[];
}

export interface QuizNodeDocument {
  id: string;
  type: "quiz";
  title: string;
  body?: string;
  question: string;
  multiple?: boolean;
  options: QuizOptionDocument[];
  correctScore?: number;
  incorrectScore?: number;
  passNext?: string;
  failNext?: string;
  next?: string;
}

export interface ResultNodeDocument {
  id: string;
  type: "result";
  title: string;
  body?: string;
  outcome?: "passed" | "failed" | "neutral";
}

export type CourseDocumentNode =
  | ContentNodeDocument
  | ChoiceNodeDocument
  | QuizNodeDocument
  | ResultNodeDocument;

export interface CourseDocument {
  id: string;
  title: string;
  description: string;
  start: string;
  passingScore: number;
  nodes: CourseDocumentNode[];
}

export type TemplateTextValue = string | string[];

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

export interface TemplateContentNodeDocument {
  id: string;
  type: "content";
  title: string;
  body?: TemplateTextValue;
  next?: string;
}

export interface TemplateChoiceNodeDocument {
  id: string;
  type: "choice";
  title: string;
  body?: TemplateTextValue;
  options: TemplateChoiceOptionDocument[];
}

export interface TemplateQuizNodeDocument {
  id: string;
  type: "quiz";
  title: string;
  body?: TemplateTextValue;
  question: string;
  multiple?: boolean;
  options: TemplateQuizOptionDocument[];
  correctScore?: string | number;
  incorrectScore?: string | number;
  passNext?: string;
  failNext?: string;
  next?: string;
}

export interface TemplateResultNodeDocument {
  id: string;
  type: "result";
  title: string;
  body?: TemplateTextValue;
  outcome?: "passed" | "failed" | "neutral";
}

export type CourseTemplateNodeDocument =
  | TemplateContentNodeDocument
  | TemplateChoiceNodeDocument
  | TemplateQuizNodeDocument
  | TemplateResultNodeDocument;

export type CourseTemplateEntryDocument =
  | CourseTemplateNodeDocument
  | BlockIncludeDocument;

export interface CourseTemplateDocument {
  id: string;
  title: string;
  description?: string;
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

const contentNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("content"),
    title: templateStringSchema,
    body: z.string().optional(),
    next: identifierSchema.optional(),
  })
  .strict();

const choiceNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("choice"),
    title: templateStringSchema,
    body: z.string().optional(),
    options: z.array(choiceOptionSchema).min(1, "At least one option is required."),
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
  })
  .strict();

const resultNodeSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("result"),
    title: templateStringSchema,
    body: z.string().optional(),
    outcome: z.enum(["passed", "failed", "neutral"]).default("neutral"),
  })
  .strict();

export const courseNodeSchema = z.discriminatedUnion("type", [
  contentNodeSchema,
  choiceNodeSchema,
  quizNodeSchema,
  resultNodeSchema,
]);

export const courseDocumentSchema = z
  .object({
    id: identifierSchema,
    title: templateStringSchema,
    description: z.string().optional().default(""),
    start: identifierSchema,
    passingScore: numberSchema.default(0),
    nodes: z.array(courseNodeSchema).min(1, "At least one node is required."),
  })
  .strict();

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
  })
  .strict();

const templateResultNodeSchema = z
  .object({
    id: templateStringSchema,
    type: z.literal("result"),
    title: templateStringSchema,
    body: textBlockSchema.optional(),
    outcome: z.enum(["passed", "failed", "neutral"]).default("neutral"),
  })
  .strict();

export const courseTemplateNodeSchema = z.discriminatedUnion("type", [
  templateContentNodeSchema,
  templateChoiceNodeSchema,
  templateQuizNodeSchema,
  templateResultNodeSchema,
]);

const blockIncludeSchema = z
  .object({
    include: identifierSchema,
  })
  .strict();

const templateDataSchema = z.record(
  identifierSchema,
  z.union([z.string(), z.number(), z.boolean()])
);

export const courseTemplateEntrySchema: z.ZodType<CourseTemplateEntryDocument> =
  z.lazy(() => z.union([courseTemplateNodeSchema, blockIncludeSchema]));

export const courseTemplateDocumentSchema: z.ZodType<CourseTemplateDocument> = z
  .object({
    id: templateStringSchema,
    title: templateStringSchema,
    description: z.string().optional().default(""),
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
