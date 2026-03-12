import { NextResponse } from "next/server";

import { eventRequestSchema } from "@/lib/intake/schema";
import { appendIntakeEntry, createEventEntry } from "@/lib/intake/store";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The event request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = eventRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid event payload." },
      { status: 400 }
    );
  }

  try {
    await appendIntakeEntry(
      createEventEntry({
        eventName: parsed.data.eventName,
        source: parsed.data.source,
        metadata: parsed.data.metadata,
      })
    );

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      { error: "The event could not be recorded." },
      { status: 500 }
    );
  }
}
