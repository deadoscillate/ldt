import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { get, list, put } from "@vercel/blob";

import type {
  FeedbackContext,
  FeedbackScreenshot,
  FeedbackStatus,
  FeedbackType,
  LeadType,
} from "@/lib/intake/schema";

export const INTAKE_KINDS = ["waitlist", "feedback", "events"] as const;

export type IntakeKind = (typeof INTAKE_KINDS)[number];
export type IntakeBackend = "vercel-blob" | "file";

interface IntakeEntryBase {
  id: string;
  kind: IntakeKind;
  submittedAt: string;
  source: string;
}

export interface WaitlistEntry extends IntakeEntryBase {
  kind: "waitlist";
  email: string;
  leadType: LeadType;
  notes: string | null;
  referrer: string | null;
}

export interface FeedbackEntry extends IntakeEntryBase {
  kind: "feedback";
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  message: string;
  email: string | null;
  sourcePage: string | null;
  context: FeedbackContext | null;
  screenshot: FeedbackScreenshot | null;
}

export interface EventEntry extends IntakeEntryBase {
  kind: "events";
  eventName: string;
  metadata: Record<string, string | number | boolean | null>;
}

export type IntakeEntry = WaitlistEntry | FeedbackEntry | EventEntry;

const LOCAL_INTAKE_DIR = path.join(process.cwd(), "data", "intake");
const BLOB_PREFIX = "beta-intake";

const LOCAL_FILE_BY_KIND: Record<IntakeKind, string> = {
  waitlist: "waitlist.jsonl",
  feedback: "feedback.jsonl",
  events: "events.jsonl",
};

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
}

function assertIntakeBackendConfigured(): void {
  if (!isBlobConfigured() && isVercelRuntime()) {
    throw new Error(
      "Configure BLOB_READ_WRITE_TOKEN for durable beta intake storage on Vercel."
    );
  }
}

function getLocalFilePath(kind: IntakeKind): string {
  return path.join(LOCAL_INTAKE_DIR, LOCAL_FILE_BY_KIND[kind]);
}

function getBlobPathname(kind: IntakeKind, id: string, submittedAt: string): string {
  return `${BLOB_PREFIX}/${kind}/${submittedAt.replace(/[:.]/g, "-")}-${id}.json`;
}

function sortEntries<T extends IntakeEntryBase>(entries: T[]): T[] {
  return [...entries].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt)
  );
}

function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unexpected intake storage failure.");
}

async function appendLocalEntry(entry: IntakeEntry): Promise<void> {
  await mkdir(LOCAL_INTAKE_DIR, { recursive: true });
  await appendFile(getLocalFilePath(entry.kind), `${JSON.stringify(entry)}\n`, "utf8");
}

async function readLocalEntries<T extends IntakeEntry>(kind: IntakeKind): Promise<T[]> {
  try {
    const contents = await readFile(getLocalFilePath(kind), "utf8");

    return sortEntries(
      contents
        .split(/\r?\n/)
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as T];
          } catch {
            return [];
          }
        })
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw normalizeError(error);
  }
}

async function appendBlobEntry(entry: IntakeEntry): Promise<void> {
  await put(
    getBlobPathname(entry.kind, entry.id, entry.submittedAt),
    JSON.stringify(entry),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    }
  );
}

async function readBlobEntries<T extends IntakeEntry>(kind: IntakeKind): Promise<T[]> {
  const prefix = `${BLOB_PREFIX}/${kind}/`;
  const blobs: { pathname: string }[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await list({
      prefix,
      cursor,
      limit: 1000,
    });

    blobs.push(...result.blobs);
    hasMore = result.hasMore;
    cursor = result.cursor;
  }

  const entries: T[] = [];

  for (const blob of blobs) {
    const result = await get(blob.pathname, {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      continue;
    }

    const text = await new Response(result.stream).text();

    try {
      entries.push(JSON.parse(text) as T);
    } catch {
      continue;
    }
  }

  return sortEntries(entries);
}

export function getIntakeBackend(): IntakeBackend {
  assertIntakeBackendConfigured();
  return isBlobConfigured() ? "vercel-blob" : "file";
}

export function createWaitlistEntry(input: {
  email: string;
  source?: string;
  referrer?: string;
  notes?: string;
  leadType?: LeadType;
}): WaitlistEntry {
  const normalizedNotes = input.notes?.trim();
  const normalizedReferrer = input.referrer?.trim();

  return {
    id: randomUUID(),
    kind: "waitlist",
    email: input.email.toLowerCase(),
    leadType: input.leadType ?? "unknown",
    notes: normalizedNotes ? normalizedNotes : null,
    referrer: normalizedReferrer ? normalizedReferrer : null,
    source: input.source ?? "landing-page",
    submittedAt: new Date().toISOString(),
  };
}

export function createFeedbackEntry(input: {
  feedbackType?: FeedbackType;
  message: string;
  email?: string;
  source?: string;
  sourcePage?: string;
  context?: FeedbackContext;
  screenshot?: FeedbackScreenshot;
}): FeedbackEntry {
  const normalizedEmail = input.email?.trim();
  const normalizedSourcePage = input.sourcePage?.trim();

  return {
    id: randomUUID(),
    kind: "feedback",
    feedbackType: input.feedbackType ?? "suggestion",
    status: "new",
    message: input.message.trim(),
    email: normalizedEmail ? normalizedEmail.toLowerCase() : null,
    sourcePage: normalizedSourcePage ? normalizedSourcePage : null,
    context: input.context ?? null,
    screenshot: input.screenshot ?? null,
    source: input.source ?? "landing-page",
    submittedAt: new Date().toISOString(),
  };
}

export function createEventEntry(input: {
  eventName: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): EventEntry {
  return {
    id: randomUUID(),
    kind: "events",
    eventName: input.eventName,
    metadata: input.metadata ?? {},
    source: input.source ?? "landing-page",
    submittedAt: new Date().toISOString(),
  };
}

export async function appendIntakeEntry(entry: IntakeEntry): Promise<IntakeBackend> {
  assertIntakeBackendConfigured();

  if (isBlobConfigured()) {
    // Prefer Blob when available so Vercel deployments get durable storage instead of ephemeral disk.
    await appendBlobEntry(entry);
    return "vercel-blob";
  }

  await appendLocalEntry(entry);
  return "file";
}

export async function listIntakeEntries<T extends IntakeEntry>(
  kind: IntakeKind
): Promise<{ backend: IntakeBackend; entries: T[] }> {
  assertIntakeBackendConfigured();

  if (isBlobConfigured()) {
    return {
      backend: "vercel-blob",
      entries: await readBlobEntries<T>(kind),
    };
  }

  return {
    backend: "file",
    entries: await readLocalEntries<T>(kind),
  };
}
