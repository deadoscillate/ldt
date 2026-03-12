import { z } from "zod";

export const VALIDATION_STATUSES = [
  "passed",
  "partial",
  "pending",
  "failed",
  "not_tested",
] as const;

export const VALIDATION_BEHAVIOR_KEYS = [
  "import",
  "launch",
  "completion",
  "score",
  "passFail",
  "resume",
] as const;

export const validationStatusSchema = z.enum(VALIDATION_STATUSES);

export const validationBehaviorStatusSchema = z
  .object({
    import: validationStatusSchema,
    launch: validationStatusSchema,
    completion: validationStatusSchema,
    score: validationStatusSchema,
    passFail: validationStatusSchema,
    resume: validationStatusSchema,
  })
  .strict();

export const validationRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    platformId: z.string().trim().min(1),
    platformName: z.string().trim().min(1),
    environment: z.string().trim().optional().default(""),
    version: z.string().trim().optional().default(""),
    validationDate: z.string().trim().optional().default(""),
    packageName: z.string().trim().optional().default(""),
    courseName: z.string().trim().optional().default(""),
    exportMode: z.enum(["standard", "validation"]),
    diagnosticsEnabled: z.boolean().optional().default(false),
    behaviors: validationBehaviorStatusSchema,
    notes: z.string().trim().optional().default(""),
    knownIssues: z.array(z.string().trim().min(1)).optional().default([]),
    validatorName: z.string().trim().optional().default(""),
    validatorSource: z.string().trim().optional().default(""),
  })
  .strict();

export const validationPlatformSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    summary: z.string().trim().optional().default(""),
    currentStatus: validationStatusSchema.optional(),
    records: z.array(validationRecordSchema).min(1),
  })
  .strict();

export const lmsValidationCatalogSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    philosophy: z.string().trim().min(1),
    betaScope: z.array(z.string().trim().min(1)).min(1),
    caveats: z.array(z.string().trim().min(1)).min(1),
    checklist: z.array(z.string().trim().min(1)).min(1),
    platforms: z.array(validationPlatformSchema).min(4),
  })
  .strict();

export type ValidationStatus = z.infer<typeof validationStatusSchema>;
export type ValidationBehaviorKey = (typeof VALIDATION_BEHAVIOR_KEYS)[number];
export type ValidationBehaviorStatusMap = z.infer<
  typeof validationBehaviorStatusSchema
>;
export type ValidationRecord = z.infer<typeof validationRecordSchema>;
export type ValidationPlatform = z.infer<typeof validationPlatformSchema>;
export type LmsValidationCatalog = z.infer<typeof lmsValidationCatalogSchema>;
