import { z } from "zod";

export const leadTypeSchema = z.enum([
  "instructional-designer",
  "consultant",
  "technical-ld",
  "unknown",
]);

export const feedbackTypeSchema = z.enum([
  "bug",
  "suggestion",
  "confusion",
  "question",
]);

export const feedbackStatusSchema = z.enum(["new", "reviewed", "resolved"]);

export const studioScreenSchema = z.enum([
  "studio",
  "builder",
  "source",
  "project",
  "variables",
  "theme",
  "preview",
  "export",
]);

export const feedbackBrowserSchema = z.object({
  userAgent: z.string().trim().min(1).max(1024),
  language: z.string().trim().max(64).optional().or(z.literal("")),
  platform: z.string().trim().max(128).optional().or(z.literal("")),
});

export const feedbackContextSchema = z.object({
  currentScreen: studioScreenSchema.optional(),
  pagePath: z.string().trim().max(256).optional().or(z.literal("")),
  projectId: z.string().trim().max(128).optional().or(z.literal("")),
  projectTitle: z.string().trim().max(160).optional().or(z.literal("")),
  templateId: z.string().trim().max(128).optional().or(z.literal("")),
  templateTitle: z.string().trim().max(160).optional().or(z.literal("")),
  variantId: z.string().trim().max(128).optional().or(z.literal("")),
  variantTitle: z.string().trim().max(160).optional().or(z.literal("")),
  themeId: z.string().trim().max(128).optional().or(z.literal("")),
  themeName: z.string().trim().max(160).optional().or(z.literal("")),
  appVersion: z.string().trim().max(64).optional().or(z.literal("")),
  clientId: z.string().trim().max(128).optional().or(z.literal("")),
  sessionId: z.string().trim().max(128).optional().or(z.literal("")),
  browser: feedbackBrowserSchema.optional(),
});

export const feedbackScreenshotSchema = z.object({
  dataUrl: z
    .string()
    .trim()
    .max(2_500_000, "Keep screenshots under roughly 2 MB.")
    .regex(
      /^data:image\/(png|jpeg|webp);base64,/,
      "Use a PNG, JPG, or WebP screenshot."
    ),
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

export const waitlistRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  source: z.string().trim().min(1).max(64).optional(),
  referrer: z.string().trim().max(1024).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  leadType: leadTypeSchema.optional(),
});

export const feedbackRequestSchema = z.object({
  feedbackType: feedbackTypeSchema.optional(),
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
  context: feedbackContextSchema.optional(),
  screenshot: feedbackScreenshotSchema.optional(),
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
export type FeedbackType = z.infer<typeof feedbackTypeSchema>;
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackScreenshot = z.infer<typeof feedbackScreenshotSchema>;
export type StudioScreen = z.infer<typeof studioScreenSchema>;
