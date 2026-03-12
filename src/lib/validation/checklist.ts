import type { LmsValidationCatalog } from "@/lib/validation/schema";

export const DEFAULT_LMS_VALIDATION_TARGETS = [
  "SCORM Cloud",
  "Moodle",
  "Canvas LMS",
  "TalentLMS",
] as const;

export const DEFAULT_LMS_VALIDATION_CHECKLIST = [
  "Import package successfully",
  "Launch package successfully",
  "Completion status updates",
  "Score reporting works",
  "Pass/fail works if configured",
  "Resume works after relaunch",
  "Record observed quirks or notes",
] as const;

export function getValidationChecklist(
  catalog?: LmsValidationCatalog | null
): readonly string[] {
  return catalog?.checklist?.length
    ? catalog.checklist
    : DEFAULT_LMS_VALIDATION_CHECKLIST;
}

export function getValidationTargets(
  catalog?: LmsValidationCatalog | null
): readonly string[] {
  return catalog?.platforms?.length
    ? catalog.platforms.map((platform) => platform.name)
    : DEFAULT_LMS_VALIDATION_TARGETS;
}

export function buildValidationNotesText(input: {
  courseId: string;
  courseTitle: string;
  exportMode: "standard" | "validation";
  diagnosticsEnabled: boolean;
  builtAt: string;
  catalog?: LmsValidationCatalog | null;
}): string {
  const checklist = getValidationChecklist(input.catalog);
  const targets = getValidationTargets(input.catalog);

  return [
    "LDT Engine LMS Validation Notes",
    "",
    `Course id: ${input.courseId}`,
    `Course title: ${input.courseTitle}`,
    `Export mode: ${input.exportMode}`,
    `Diagnostics enabled: ${input.diagnosticsEnabled ? "yes" : "no"}`,
    `Built at: ${input.builtAt}`,
    "",
    "Use this checklist when validating the package in a real LMS.",
    "",
    ...targets.flatMap((target) => [
      `${target}`,
      ...checklist.map((item) => `- [ ] ${item}`),
      "- Notes:",
      "",
    ]),
  ].join("\n");
}
