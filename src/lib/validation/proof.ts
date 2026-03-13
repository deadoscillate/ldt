import type {
  LmsValidationCatalog,
  ValidationBehaviorKey,
  ValidationPlatform,
  ValidationRecord,
  ValidationStatus,
} from "@/lib/validation/schema";

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  passed: "Passed",
  partial: "Partial",
  pending: "Pending",
  failed: "Failed",
  not_tested: "Not tested",
};

export const VALIDATION_BEHAVIOR_LABELS: Record<ValidationBehaviorKey, string> = {
  import: "Import",
  launch: "Launch",
  completion: "Completion",
  score: "Score",
  passFail: "Pass/fail",
  resume: "Resume",
};

function parseValidationDate(value: string): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedDate = Date.parse(value);
  return Number.isNaN(parsedDate) ? Number.NEGATIVE_INFINITY : parsedDate;
}

export function getLatestValidationRecord(
  platform: ValidationPlatform
): ValidationRecord {
  return [...platform.records].sort(
    (leftRecord, rightRecord) =>
      parseValidationDate(rightRecord.validationDate) -
      parseValidationDate(leftRecord.validationDate)
  )[0]!;
}

export function normalizeValidationStatus(
  record: ValidationRecord
): ValidationStatus {
  const statuses = Object.values(record.behaviors);

  if (statuses.every((status) => status === "passed")) {
    return "passed";
  }

  if (statuses.every((status) => status === "not_tested")) {
    return "not_tested";
  }

  if (
    statuses.every(
      (status) => status === "pending" || status === "not_tested"
    )
  ) {
    return statuses.some((status) => status === "pending")
      ? "pending"
      : "not_tested";
  }

  if (
    statuses.some((status) => status === "failed") &&
    !statuses.some((status) => status === "passed" || status === "partial")
  ) {
    return "failed";
  }

  return "partial";
}

export function getPlatformValidationStatus(
  platform: ValidationPlatform
): ValidationStatus {
  return platform.currentStatus ?? normalizeValidationStatus(getLatestValidationRecord(platform));
}

export function countBehaviorsWithStatus(
  record: ValidationRecord,
  status: ValidationStatus
): number {
  return Object.values(record.behaviors).filter(
    (behaviorStatus) => behaviorStatus === status
  ).length;
}

export function getPassedBehaviorLabels(record: ValidationRecord): string[] {
  return (Object.entries(record.behaviors) as Array<
    [ValidationBehaviorKey, ValidationStatus]
  >)
    .filter(([, status]) => status === "passed")
    .map(([behaviorKey]) => VALIDATION_BEHAVIOR_LABELS[behaviorKey]);
}

export interface PlatformProofSummary {
  id: string;
  name: string;
  status: ValidationStatus;
  latestValidationDate: string;
  passedBehaviorCount: number;
  totalBehaviorCount: number;
}

export function buildPlatformProofSummary(
  platform: ValidationPlatform
): PlatformProofSummary {
  const latestRecord = getLatestValidationRecord(platform);

  return {
    id: platform.id,
    name: platform.name,
    status: getPlatformValidationStatus(platform),
    latestValidationDate: latestRecord.validationDate,
    passedBehaviorCount: countBehaviorsWithStatus(latestRecord, "passed"),
    totalBehaviorCount: Object.keys(latestRecord.behaviors).length,
  };
}

export interface ProofSummaryCardData {
  valueProp: string;
  scormCloudStatus: ValidationStatus;
  platformStatuses: PlatformProofSummary[];
  testedBehaviorLabels: string[];
  studioHref: string;
  proofHref: string;
}

export function buildProofSummaryCardData(
  catalog: LmsValidationCatalog
): ProofSummaryCardData {
  const platformStatuses = catalog.platforms.map(buildPlatformProofSummary);
  const scormCloudPlatform = catalog.platforms.find(
    (platform) => platform.id === "scorm-cloud"
  );
  const scormCloudRecord = scormCloudPlatform
    ? getLatestValidationRecord(scormCloudPlatform)
    : null;

  return {
    valueProp:
      "Structured authoring, reusable modules, and reproducible SCORM builds.",
    scormCloudStatus: scormCloudPlatform
      ? getPlatformValidationStatus(scormCloudPlatform)
      : "pending",
    platformStatuses,
    testedBehaviorLabels: scormCloudRecord
      ? getPassedBehaviorLabels(scormCloudRecord)
      : [],
    studioHref: "/studio",
    proofHref: "/validation",
  };
}
