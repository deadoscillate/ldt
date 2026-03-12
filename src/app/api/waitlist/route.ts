import { NextResponse } from "next/server";

import { sendWaitlistConfirmationEmail } from "@/lib/intake/email";
import { waitlistRequestSchema } from "@/lib/intake/schema";
import { appendIntakeEntry, createWaitlistEntry } from "@/lib/intake/store";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The waitlist request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = waitlistRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      },
      { status: 400 }
    );
  }

  try {
    const entry = createWaitlistEntry({
      email: parsed.data.email,
      leadType: parsed.data.leadType,
      notes: parsed.data.notes,
      referrer: parsed.data.referrer,
      source: parsed.data.source,
    });
    const backend = await appendIntakeEntry(entry);
    const emailResult = await sendWaitlistConfirmationEmail(entry.email);

    if (emailResult.enabled && !emailResult.sent && emailResult.error) {
      console.error("Waitlist confirmation email failed:", emailResult.error);
    }

    return NextResponse.json({
      ok: true,
      backend,
      emailSent: emailResult.sent,
      message: "You're on the early access list.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The waitlist request could not be saved.",
      },
      { status: 500 }
    );
  }
}
