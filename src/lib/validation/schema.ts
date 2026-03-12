import { z } from "zod";

const validationTargetSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  validationDate: z.string().trim().optional().default(""),
  version: z.string().trim().optional().default(""),
  importPassed: z.boolean(),
  launchPassed: z.boolean(),
  completionPassed: z.boolean(),
  scorePassed: z.boolean(),
  passFailPassed: z.boolean(),
  resumePassed: z.boolean(),
  notes: z.string().trim().optional().default(""),
});

export const lmsValidationCatalogSchema = z.object({
  scormCloudStatus: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  checklist: z.array(z.string().trim().min(1)).min(1),
  targets: z.array(validationTargetSchema).min(3),
});

export type LmsValidationCatalog = z.infer<typeof lmsValidationCatalogSchema>;
export type LmsValidationTarget = z.infer<typeof validationTargetSchema>;
