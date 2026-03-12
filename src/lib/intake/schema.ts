import { z } from "zod";

export const leadTypeSchema = z.enum([
  "instructional-designer",
  "consultant",
  "technical-ld",
  "unknown",
]);

export const waitlistRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  source: z.string().trim().min(1).max(64).optional(),
  referrer: z.string().trim().max(1024).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  leadType: leadTypeSchema.optional(),
});

export const feedbackRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(8, "Share at least a short sentence.")
    .max(1000, "Keep feedback under 1000 characters."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  source: z.string().trim().min(1).max(64).optional(),
  sourcePage: z.string().trim().max(256).optional().or(z.literal("")),
});

export const eventRequestSchema = z.object({
  eventName: z.string().trim().min(1).max(80),
  source: z.string().trim().min(1).max(64).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type EventRequest = z.infer<typeof eventRequestSchema>;
export type LeadType = z.infer<typeof leadTypeSchema>;
