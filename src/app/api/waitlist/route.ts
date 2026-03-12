import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { waitlistRequestSchema } from "@/lib/waitlist/schema";

const waitlistFilePath = path.join(process.cwd(), "data", "waitlist-entries.jsonl");

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

  const entry = {
    email: parsed.data.email.toLowerCase(),
    source: parsed.data.source ?? "landing-page",
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  console.info("[waitlist] submission", entry);

  let storage: "file" | "log" = "log";

  try {
    // Persist locally when possible, but keep a server log fallback for simple deployments.
    await mkdir(path.dirname(waitlistFilePath), { recursive: true });
    await appendFile(waitlistFilePath, `${JSON.stringify(entry)}\n`, "utf8");
    storage = "file";
  } catch (error) {
    console.warn("[waitlist] file persistence failed; submission kept in logs", error);
  }

  return NextResponse.json({
    ok: true,
    storage,
    message:
      storage === "file"
        ? "You have been added to the early access list."
        : "You have been added to the early access list. The submission is currently stored in server logs.",
  });
}
