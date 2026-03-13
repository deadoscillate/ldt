import {
  compareModuleVersions,
  type SharedModule,
  type SharedModuleLibrary,
} from "@/lib/module-library/schema";

export function resolveSharedModule(
  library: SharedModuleLibrary | null | undefined,
  moduleId: string,
  requestedVersion: string | null | undefined
): {
  module: SharedModule | null;
  latest: SharedModule | null;
  requestedVersion: string | null;
} {
  const requested = requestedVersion?.trim() || null;
  const candidates = (library?.modules ?? []).filter(
    (candidate) => candidate.id === moduleId
  );

  if (candidates.length === 0) {
    return {
      module: null,
      latest: null,
      requestedVersion: requested,
    };
  }

  const sorted = [...candidates].sort((leftModule, rightModule) =>
    compareModuleVersions(rightModule.version, leftModule.version)
  );
  const latest = sorted[0] ?? null;
  const resolved =
    requested === null
      ? latest
      : sorted.find((candidate) => candidate.version === requested) ?? null;

  return {
    module: resolved,
    latest,
    requestedVersion: requested,
  };
}
