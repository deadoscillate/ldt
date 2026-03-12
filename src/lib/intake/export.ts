import type {
  EventEntry,
  FeedbackEntry,
  IntakeEntry,
  IntakeKind,
  WaitlistEntry,
} from "@/lib/intake/store";

export type IntakeExportFormat = "json" | "csv";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

function buildWaitlistCsv(entries: WaitlistEntry[]): string {
  return [
    "email,leadType,notes,referrer,submittedAt,source",
    ...entries.map((entry) =>
      [
        escapeCsvCell(entry.email),
        escapeCsvCell(entry.leadType),
        escapeCsvCell(entry.notes ?? ""),
        escapeCsvCell(entry.referrer ?? ""),
        escapeCsvCell(entry.submittedAt),
        escapeCsvCell(entry.source),
      ].join(",")
    ),
  ].join("\n");
}

function buildFeedbackCsv(entries: FeedbackEntry[]): string {
  return [
    "message,email,sourcePage,submittedAt,source",
    ...entries.map((entry) =>
      [
        escapeCsvCell(entry.message),
        escapeCsvCell(entry.email ?? ""),
        escapeCsvCell(entry.sourcePage ?? ""),
        escapeCsvCell(entry.submittedAt),
        escapeCsvCell(entry.source),
      ].join(",")
    ),
  ].join("\n");
}

function buildEventCsv(entries: EventEntry[]): string {
  return [
    "eventName,submittedAt,source,metadata",
    ...entries.map((entry) =>
      [
        escapeCsvCell(entry.eventName),
        escapeCsvCell(entry.submittedAt),
        escapeCsvCell(entry.source),
        escapeCsvCell(JSON.stringify(entry.metadata)),
      ].join(",")
    ),
  ].join("\n");
}

export function serializeIntakeEntries(
  kind: IntakeKind,
  format: IntakeExportFormat,
  entries: IntakeEntry[]
): string {
  if (format === "json") {
    return JSON.stringify(entries, null, 2);
  }

  switch (kind) {
    case "waitlist":
      return buildWaitlistCsv(entries as WaitlistEntry[]);
    case "feedback":
      return buildFeedbackCsv(entries as FeedbackEntry[]);
    case "events":
      return buildEventCsv(entries as EventEntry[]);
    default:
      return "";
  }
}

export function getIntakeExportContentType(format: IntakeExportFormat): string {
  return format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8";
}

export function buildIntakeExportFileName(
  kind: IntakeKind,
  format: IntakeExportFormat
): string {
  return `${kind}-export.${format}`;
}
