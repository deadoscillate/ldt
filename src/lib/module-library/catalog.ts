import {
  buildTemplateFieldDefinitions,
  type TemplateFieldDefinition,
} from "@/lib/course/template-variables";
import type {
  ModuleUsageIndex,
  ModuleUsageTargetSummary,
} from "@/lib/project/affected";

import {
  compareModuleVersions,
  type SharedModule,
  type SharedModuleLibrary,
} from "@/lib/module-library/schema";

export type SharedModuleTestStatus =
  | "module-tests"
  | "course-tests"
  | "untested";

export interface SharedModuleFamily {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  latestVersion: string;
  versionCount: number;
  usedByCount: number;
  dependencyCount: number;
  testStatus: SharedModuleTestStatus;
  latestModule: SharedModule;
  versions: SharedModule[];
  usedBy: ModuleUsageTargetSummary[];
  upgradeTargets: ModuleUsageTargetSummary[];
  acceptedVariables: TemplateFieldDefinition[];
}

function sortModulesByVersion(modules: readonly SharedModule[]): SharedModule[] {
  return [...modules].sort((leftModule, rightModule) =>
    compareModuleVersions(rightModule.version, leftModule.version)
  );
}

export function buildSharedModuleFamilies(
  library: SharedModuleLibrary | null | undefined,
  moduleUsageIndex: ModuleUsageIndex
): SharedModuleFamily[] {
  if (!library) {
    return [];
  }

  const families = new Map<string, SharedModule[]>();

  library.modules.forEach((module) => {
    const existingModules = families.get(module.id) ?? [];
    existingModules.push(module);
    families.set(module.id, existingModules);
  });

  return [...families.entries()]
    .map(([moduleId, modules]) => {
      const versions = sortModulesByVersion(modules);
      const latestModule = versions[0]!;
      const usedBy = [...(moduleUsageIndex[moduleId] ?? [])].sort((leftTarget, rightTarget) =>
        `${leftTarget.projectId}/${leftTarget.targetKey}`.localeCompare(
          `${rightTarget.projectId}/${rightTarget.targetKey}`
        )
      );
      const upgradeTargets = usedBy.filter(
        (target) => compareModuleVersions(target.version, latestModule.version) < 0
      );

      return {
        id: moduleId,
        title: latestModule.title,
        description: latestModule.description,
        category: latestModule.category,
        tags: [...new Set(versions.flatMap((module) => module.tags))].sort(),
        lastUpdated: versions
          .map((module) => module.lastUpdated)
          .sort((leftValue, rightValue) => rightValue.localeCompare(leftValue))[0]!,
        latestVersion: latestModule.version,
        versionCount: versions.length,
        usedByCount: usedBy.length,
        dependencyCount: latestModule.dependencyReferences.length,
        testStatus:
          latestModule.tests.length > 0
            ? "module-tests"
            : usedBy.some((target) => target.logicTestCount > 0)
              ? "course-tests"
              : "untested",
        latestModule,
        versions,
        usedBy,
        upgradeTargets,
        acceptedVariables: buildTemplateFieldDefinitions(
          latestModule.templateData,
          latestModule.variableSchema
        ),
      } satisfies SharedModuleFamily;
    })
    .sort((leftFamily, rightFamily) =>
      `${leftFamily.category}/${leftFamily.title}`.localeCompare(
        `${rightFamily.category}/${rightFamily.title}`
      )
    );
}

export function findSharedModuleVersion(
  family: SharedModuleFamily | null | undefined,
  version: string | null | undefined
): SharedModule | null {
  if (!family) {
    return null;
  }

  if (!version) {
    return family.latestModule;
  }

  return family.versions.find((candidate) => candidate.version === version) ?? null;
}

export function summarizeModuleUsageCoverage(
  usageTargets: readonly ModuleUsageTargetSummary[]
): string {
  if (usageTargets.length === 0) {
    return "No current course builds depend on this module.";
  }

  const testedTargets = usageTargets.filter((target) => target.logicTestCount > 0).length;

  if (testedTargets === usageTargets.length) {
    return "Every dependent build currently has course logic tests.";
  }

  if (testedTargets === 0) {
    return "No dependent builds currently expose course logic tests.";
  }

  return `${testedTargets} of ${usageTargets.length} dependent build targets currently expose course logic tests.`;
}
