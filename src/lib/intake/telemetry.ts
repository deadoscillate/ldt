import type { EventEntry } from "@/lib/intake/store";

export interface FrictionSignal {
  id:
    | "abandoned-onboarding"
    | "preview-without-export"
    | "repeated-validation-errors"
    | "export-failures"
    | "repeated-template-switching";
  label: string;
  count: number;
  description: string;
}

function getMetadataValue(entry: EventEntry, key: string): string | null {
  const value = entry.metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function getSessionId(entry: EventEntry): string {
  return getMetadataValue(entry, "sessionId") ?? `session:${entry.id}`;
}

function groupEventsBySession(entries: EventEntry[]): Map<string, EventEntry[]> {
  const groupedEvents = new Map<string, EventEntry[]>();

  for (const entry of entries) {
    const sessionId = getSessionId(entry);
    const currentEntries = groupedEvents.get(sessionId) ?? [];

    groupedEvents.set(sessionId, [...currentEntries, entry]);
  }

  return groupedEvents;
}

function countSessions(
  groupedEvents: Map<string, EventEntry[]>,
  predicate: (entries: EventEntry[]) => boolean
): number {
  let count = 0;

  for (const entries of groupedEvents.values()) {
    if (predicate(entries)) {
      count += 1;
    }
  }

  return count;
}

export function buildFrictionSignals(entries: EventEntry[]): FrictionSignal[] {
  const groupedEvents = groupEventsBySession(entries);
  const abandonedOnboardingCount = countSessions(
    groupedEvents,
    (sessionEntries) =>
      sessionEntries.some((entry) => entry.eventName === "onboarding_started") &&
      !sessionEntries.some((entry) => entry.eventName === "onboarding_completed")
  );
  const previewWithoutExportCount = countSessions(
    groupedEvents,
    (sessionEntries) =>
      sessionEntries.some(
        (entry) =>
          entry.eventName === "preview_opened" ||
          entry.eventName === "first_preview_opened"
      ) &&
      !sessionEntries.some(
        (entry) =>
          entry.eventName === "export_succeeded" ||
          entry.eventName === "first_export_completed"
      )
  );
  const repeatedValidationErrorCount = countSessions(
    groupedEvents,
    (sessionEntries) =>
      sessionEntries.filter((entry) => entry.eventName === "validation_issues_detected")
        .length >= 2
  );
  const exportFailureCount = entries.filter(
    (entry) => entry.eventName === "export_failed"
  ).length;
  const repeatedTemplateSwitchingCount = countSessions(
    groupedEvents,
    (sessionEntries) =>
      sessionEntries.filter(
        (entry) =>
          entry.eventName === "template_selected" ||
          entry.eventName === "starter_template_selected"
      ).length >= 3
  );

  return [
    {
      id: "abandoned-onboarding",
      label: "Abandoned onboarding sessions",
      count: abandonedOnboardingCount,
      description:
        "Sessions that started onboarding but never reached the explicit path completion step.",
    },
    {
      id: "preview-without-export",
      label: "Preview sessions without export",
      count: previewWithoutExportCount,
      description:
        "Sessions that reached a preview but did not record a successful SCORM export.",
    },
    {
      id: "repeated-validation-errors",
      label: "Sessions with repeated validation errors",
      count: repeatedValidationErrorCount,
      description:
        "Sessions that hit validation issues more than once, which often indicates authoring friction.",
    },
    {
      id: "export-failures",
      label: "Export failures",
      count: exportFailureCount,
      description:
        "Failed export attempts recorded by the studio during beta usage.",
    },
    {
      id: "repeated-template-switching",
      label: "Sessions with repeated template switching",
      count: repeatedTemplateSwitchingCount,
      description:
        "Sessions that switched starter templates repeatedly, which can suggest users are hunting for the right path.",
    },
  ];
}
