import { z } from "zod";

export const waitlistRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  source: z.string().trim().min(1).max(64).optional(),
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
