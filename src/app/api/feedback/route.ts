import { NextResponse } from "next/server";

import { feedbackRequestSchema } from "@/lib/intake/schema";
import { appendIntakeEntry, createFeedbackEntry } from "@/lib/intake/store";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The feedback request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = feedbackRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Share a short note about what you need this tool to handle.",
      },
      { status: 400 }
    );
  }

  try {
    const backend = await appendIntakeEntry(
      createFeedbackEntry({
        feedbackType: parsed.data.feedbackType,
        message: parsed.data.message,
        email: parsed.data.email,
        sourcePage: parsed.data.sourcePage,
        source: parsed.data.source,
        context: parsed.data.context,
        screenshot: parsed.data.screenshot,
      })
    );

    return NextResponse.json({
      ok: true,
      backend,
      message: "Feedback recorded.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Feedback could not be saved.",
      },
      { status: 500 }
    );
  }
}
