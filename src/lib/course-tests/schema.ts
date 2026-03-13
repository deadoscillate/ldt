import yaml from "js-yaml";
import { z, ZodError } from "zod";

import type { TemplateScalarValue } from "@/lib/course/schema";

export type CourseLogicTestCompletionStatus = "incomplete" | "completed";
export type CourseLogicTestSuccessStatus =
  | "passed"
  | "failed"
  | "neutral"
  | "none";

export interface CourseLogicTestTarget {
  templateId?: string;
  variantId?: string;
  themeId?: string;
}

export interface CourseLogicTestInitialState {
  currentNodeId?: string;
  score?: number;
  completed?: boolean;
}

export interface CourseLogicTestAdvanceAction {
  step: string;
  advance: true;
}

export interface CourseLogicTestSelectAction {
  step: string;
  select: string | string[];
}

export type CourseLogicTestAction =
  | CourseLogicTestAdvanceAction
  | CourseLogicTestSelectAction;

export interface CourseLogicTestExpectations {
  terminalStep?: string;
  score?: number;
  scoreAtLeast?: number;
  completionStatus?: CourseLogicTestCompletionStatus;
  successStatus?: CourseLogicTestSuccessStatus;
  pathLength?: number;
  variables?: Record<string, TemplateScalarValue>;
}

export interface CourseLogicTestCase {
  id: string;
  name: string;
  description: string;
  tags: string[];
  target: CourseLogicTestTarget | null;
  initialState: CourseLogicTestInitialState | null;
  actions: CourseLogicTestAction[];
  expect: CourseLogicTestExpectations;
}

export interface CourseLogicTestSuite {
  id: string;
  title: string;
  description: string;
  tags: string[];
  sourcePath: string;
  source: string;
  targetDefaults: CourseLogicTestTarget | null;
  tests: CourseLogicTestCase[];
}

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Value is required.")
  .regex(
    /^[A-Za-z0-9_.-]+$/,
    "Use letters, numbers, periods, hyphens, or underscores only."
  );
const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);

const targetSchema = z
  .object({
    templateId: identifierSchema.optional(),
    variantId: identifierSchema.optional(),
    themeId: identifierSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.templateId !== undefined ||
      value.variantId !== undefined ||
      value.themeId !== undefined,
    {
      message:
        'Provide at least one of "templateId", "variantId", or "themeId" when a test target override is defined.',
    }
  );

const initialStateSchema = z
  .object({
    currentNodeId: identifierSchema.optional(),
    score: z.number().finite().optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.currentNodeId !== undefined ||
      value.score !== undefined ||
      value.completed !== undefined,
    {
      message:
        'Provide at least one initial state override when "initialState" is present.',
    }
  );

const advanceActionSchema = z
  .object({
    step: identifierSchema,
    advance: z.literal(true),
  })
  .strict();

const selectActionSchema = z
  .object({
    step: identifierSchema,
    select: z.union([
      identifierSchema,
      z.array(identifierSchema).min(1, "Select at least one option."),
    ]),
  })
  .strict();

const expectationsSchema = z
  .object({
    terminalStep: identifierSchema.optional(),
    score: z.number().finite().optional(),
    scoreAtLeast: z.number().finite().optional(),
    completionStatus: z.enum(["incomplete", "completed"]).optional(),
    successStatus: z.enum(["passed", "failed", "neutral", "none"]).optional(),
    pathLength: z.number().int().positive().optional(),
    variables: z.record(identifierSchema, scalarSchema).optional(),
  })
  .strict();

const testCaseSchema = z
  .object({
    id: identifierSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().optional().default(""),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    target: targetSchema.optional().nullable(),
    initialState: initialStateSchema.optional().nullable(),
    actions: z.array(z.union([advanceActionSchema, selectActionSchema])).default([]),
    expect: expectationsSchema,
  })
  .strict();

const testSuiteSchema = z
  .object({
    id: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().optional().default(""),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    target: targetSchema.optional().nullable(),
    tests: z.array(testCaseSchema).min(1, "Add at least one logic test."),
  })
  .strict();

function formatZodIssues(error: ZodError, fallbackPath: string): string[] {
  return error.issues.map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : fallbackPath;

    return `${path}: ${issue.message}`;
  });
}

export function parseCourseLogicTestSuiteYaml(input: {
  source: string;
  sourcePath: string;
}): CourseLogicTestSuite {
  try {
    const parsed = testSuiteSchema.parse(
      JSON.parse(JSON.stringify(yaml.load(input.source) ?? {}))
    );

    return {
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags,
      sourcePath: input.sourcePath,
      source: input.source,
      targetDefaults: parsed.target ?? null,
      tests: parsed.tests.map((testCase) => ({
        id: testCase.id,
        name: testCase.name,
        description: testCase.description,
        tags: testCase.tags,
        target: testCase.target ?? null,
        initialState: testCase.initialState ?? null,
        actions: testCase.actions,
        expect: {
          ...testCase.expect,
          variables: testCase.expect.variables ?? undefined,
        },
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, input.sourcePath)[0] ??
          "Invalid course logic test definition."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}
