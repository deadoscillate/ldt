import {
  runCourseProjectAutomation,
  type CourseProjectAutomationRun,
  type CourseProjectBuildArtifactPlan,
  type CourseProjectBuildIssue,
} from "@/lib/project/automation";
import {
  listCourseProjectBuildSelections,
  resolveCourseProjectBuildSelection,
  type CourseProjectBuildSelection,
} from "@/lib/project/build";
import type { CourseProject } from "@/lib/project/schema";
import {
  buildAffectedRebuildManifest,
  type AffectedBuildTarget,
  type AffectedRebuildManifest,
} from "@/lib/module-library/dependency";
import type { SharedModuleLibrary } from "@/lib/module-library/schema";
import type { ScormExportMode } from "@/lib/export/scorm-export";

export interface DetectAffectedTargetsOptions {
  changedInputs?: readonly string[];
  moduleIds?: readonly string[];
  projectId?: string | null;
  moduleLibrary?: SharedModuleLibrary | null;
}

export interface AffectedRebuildOptions extends DetectAffectedTargetsOptions {
  generatedAt?: string;
  exportMode?: ScormExportMode;
  failOnWarning?: boolean;
}

export interface AffectedRebuildRunReport {
  generatedAt: string;
  exportMode: ScormExportMode;
  changedInputs: readonly string[];
  changedModules: readonly string[];
  success: boolean;
  totalAffectedTargets: number;
  successfulBuilds: number;
  failedBuilds: number;
  skippedBuilds: number;
  warningCount: number;
  errorCount: number;
  outputPaths: readonly string[];
  warnings: readonly CourseProjectBuildIssue[];
  errors: readonly CourseProjectBuildIssue[];
  targets: readonly AffectedBuildTarget[];
}

export interface AffectedRebuildRun {
  report: AffectedRebuildRunReport;
  artifacts: readonly CourseProjectBuildArtifactPlan[];
  manifest: AffectedRebuildManifest;
  summaryMarkdown: string;
  projectRuns: readonly CourseProjectAutomationRun[];
}

export interface ModuleUsageTargetSummary {
  projectId: string;
  projectTitle: string;
  targetKey: string;
  courseId: string;
  courseTitle: string;
  version: string;
  logicTestCount: number;
}

export type ModuleUsageIndex = Record<string, ModuleUsageTargetSummary[]>;

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function buildChangedModuleIds(input: {
  library: SharedModuleLibrary | null;
  changedInputs: readonly string[];
  moduleIds: readonly string[];
}): string[] {
  const moduleIds = new Set<string>(input.moduleIds);
  const changedPaths = new Set(input.changedInputs.map((value) => normalizePath(value)));

  if (!input.library) {
    return [...moduleIds];
  }

  input.library.modules.forEach((module) => {
    if (
      changedPaths.has(normalizePath(module.sourcePath)) ||
      changedPaths.has(normalizePath(`module-library/${module.sourcePath}`))
    ) {
      moduleIds.add(module.id);
    }
  });

  return [...moduleIds].sort((leftId, rightId) => leftId.localeCompare(rightId));
}

function matchesChangedInput(
  sourceFiles: readonly string[],
  changedInputs: readonly string[]
): boolean {
  const normalizedSourceFiles = new Set(sourceFiles.map((value) => normalizePath(value)));

  return changedInputs.some((value) => {
    const normalizedValue = normalizePath(value);

    return (
      normalizedSourceFiles.has(normalizedValue) ||
      normalizedSourceFiles.has(normalizedValue.replace(/^module-library\//, ""))
    );
  });
}

export function detectAffectedBuildTargets(
  projects: readonly CourseProject[],
  options: DetectAffectedTargetsOptions = {}
): AffectedBuildTarget[] {
  const filteredProjects = options.projectId
    ? projects.filter((project) => project.id === options.projectId)
    : [...projects];
  const changedInputs = [...(options.changedInputs ?? [])].map((value) =>
    normalizePath(value)
  );
  const changedModules = buildChangedModuleIds({
    library: options.moduleLibrary ?? null,
    changedInputs,
    moduleIds: options.moduleIds ?? [],
  });
  const affectedTargets: AffectedBuildTarget[] = [];

  filteredProjects.forEach((project) => {
    listCourseProjectBuildSelections(project).forEach((selection) => {
      try {
        const resolvedSelection = resolveCourseProjectBuildSelection(project, selection, {
          moduleLibrary: options.moduleLibrary ?? null,
        });
        const matchingModuleDependencies =
          resolvedSelection.dependencyGraph.moduleDependencies.filter((dependency) =>
            changedModules.includes(dependency.moduleId)
          );
        const changedInputMatch = matchesChangedInput(
          resolvedSelection.dependencyGraph.sourceFiles,
          changedInputs
        );

        if (matchingModuleDependencies.length === 0 && !changedInputMatch) {
          return;
        }

        affectedTargets.push({
          projectId: project.id,
          projectTitle: project.title,
          projectVersion: project.version,
          selection,
          targetKey: resolvedSelection.dependencyGraph.targetKey,
          courseId: resolvedSelection.dependencyGraph.courseId,
          courseTitle: resolvedSelection.dependencyGraph.courseTitle,
          reason:
            matchingModuleDependencies.length > 0
              ? `Depends on shared module${matchingModuleDependencies.length === 1 ? "" : "s"} ${matchingModuleDependencies
                  .map((dependency) => `${dependency.moduleId}@${dependency.version}`)
                  .join(", ")}.`
              : `Depends on changed source file${changedInputs.length === 1 ? "" : "s"} ${changedInputs.join(", ")}.`,
          dependencyGraph: resolvedSelection.dependencyGraph,
        });
      } catch {
        // Invalid selections should not block affected-target detection across the rest of the repo.
      }
    });
  });

  return affectedTargets.sort((leftTarget, rightTarget) =>
    `${leftTarget.projectId}/${leftTarget.targetKey}`.localeCompare(
      `${rightTarget.projectId}/${rightTarget.targetKey}`
    )
  );
}

export function buildModuleUsageIndex(
  projects: readonly CourseProject[],
  moduleLibrary: SharedModuleLibrary | null
): ModuleUsageIndex {
  const usageIndex: ModuleUsageIndex = {};

  projects.forEach((project) => {
    listCourseProjectBuildSelections(project).forEach((selection) => {
      try {
        const resolvedSelection = resolveCourseProjectBuildSelection(project, selection, {
          moduleLibrary,
        });
        const seenDependencies = new Set<string>();

        resolvedSelection.dependencyGraph.moduleDependencies.forEach((dependency) => {
          const dependencyKey = `${dependency.moduleId}@${dependency.version}::${resolvedSelection.dependencyGraph.targetKey}`;

          if (seenDependencies.has(dependencyKey)) {
            return;
          }

          seenDependencies.add(dependencyKey);

          const currentTargets = usageIndex[dependency.moduleId] ?? [];
          currentTargets.push({
            projectId: project.id,
            projectTitle: project.title,
            targetKey: resolvedSelection.dependencyGraph.targetKey,
            courseId: resolvedSelection.dependencyGraph.courseId,
            courseTitle: resolvedSelection.dependencyGraph.courseTitle,
            version: dependency.version,
            logicTestCount: project.logicTestSuites.length,
          });
          usageIndex[dependency.moduleId] = currentTargets.sort((leftTarget, rightTarget) =>
            `${leftTarget.projectId}/${leftTarget.targetKey}`.localeCompare(
              `${rightTarget.projectId}/${rightTarget.targetKey}`
            )
          );
        });
      } catch {
        // Invalid selections should not block the rest of the usage index.
      }
    });
  });

  return usageIndex;
}

function buildAffectedSummaryMarkdown(report: AffectedRebuildRunReport): string {
  const lines = [
    "# Affected Rebuild Summary",
    "",
    `- Generated at: \`${report.generatedAt}\``,
    `- Export mode: \`${report.exportMode}\``,
    `- Changed inputs: ${report.changedInputs.length > 0 ? report.changedInputs.map((value) => `\`${value}\``).join(", ") : "none"}`,
    `- Changed modules: ${report.changedModules.length > 0 ? report.changedModules.map((value) => `\`${value}\``).join(", ") : "none"}`,
    `- Success: \`${report.success}\``,
    `- Affected targets: ${report.totalAffectedTargets}`,
    `- Successful builds: ${report.successfulBuilds}`,
    `- Failed builds: ${report.failedBuilds}`,
    `- Skipped builds: ${report.skippedBuilds}`,
    `- Warnings: ${report.warningCount}`,
    `- Errors: ${report.errorCount}`,
    "",
    "## Targets",
    "",
  ];

  report.targets.forEach((target) => {
    lines.push(`- \`${target.projectId}/${target.targetKey}\`: ${target.reason}`);
  });

  if (report.warningCount > 0) {
    lines.push("", "## Warnings", "");
    report.warnings.forEach((warning) => {
      lines.push(`- ${warning.message}`);
    });
  }

  if (report.errorCount > 0) {
    lines.push("", "## Errors", "");
    report.errors.forEach((error) => {
      lines.push(`- ${error.message}`);
    });
  }

  return lines.join("\n");
}

export async function runAffectedRebuild(
  projects: readonly CourseProject[],
  options: AffectedRebuildOptions = {}
): Promise<AffectedRebuildRun> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const exportMode = options.exportMode ?? "standard";
  const changedInputs = [...(options.changedInputs ?? [])].map((value) =>
    normalizePath(value)
  );
  const changedModules = buildChangedModuleIds({
    library: options.moduleLibrary ?? null,
    changedInputs,
    moduleIds: options.moduleIds ?? [],
  });
  const targets = detectAffectedBuildTargets(projects, options);
  const targetsByProject = new Map<string, CourseProjectBuildSelection[]>();

  targets.forEach((target) => {
    const currentSelections = targetsByProject.get(target.projectId) ?? [];
    currentSelections.push(target.selection);
    targetsByProject.set(target.projectId, currentSelections);
  });

  const projectRuns = await Promise.all(
    [...targetsByProject.entries()].map(async ([projectId, selections]) => {
      const project = projects.find((candidate) => candidate.id === projectId);

      if (!project) {
        throw new Error(`Affected rebuild could not find project "${projectId}".`);
      }

      return runCourseProjectAutomation(project, "export-all", {
        selections,
        generatedAt,
        exportMode,
        failOnWarning: options.failOnWarning ?? false,
        moduleLibrary: options.moduleLibrary ?? null,
      });
    })
  );

  const warnings = projectRuns.flatMap((run) => run.report.warnings);
  const errors = projectRuns.flatMap((run) => run.report.errors);
  const artifacts = projectRuns.flatMap((run) => run.artifacts);
  const outputPaths = artifacts.map((artifact) => artifact.path);
  const report: AffectedRebuildRunReport = {
    generatedAt,
    exportMode,
    changedInputs,
    changedModules,
    success:
      projectRuns.every((run) => run.report.success) &&
      (!(options.failOnWarning ?? false) || warnings.length === 0),
    totalAffectedTargets: targets.length,
    successfulBuilds: projectRuns.reduce(
      (count, run) => count + run.report.successfulBuilds,
      0
    ),
    failedBuilds: projectRuns.reduce(
      (count, run) => count + run.report.failedBuilds,
      0
    ),
    skippedBuilds: projectRuns.reduce(
      (count, run) => count + run.report.skippedBuilds,
      0
    ),
    warningCount: warnings.length,
    errorCount: errors.length,
    outputPaths,
    warnings,
    errors,
    targets,
  };
  const manifest = buildAffectedRebuildManifest({
    generatedAt,
    changedInputs,
    changedModules,
    targets,
  });
  const summaryMarkdown = buildAffectedSummaryMarkdown(report);

  return {
    report,
    artifacts,
    manifest,
    summaryMarkdown,
    projectRuns,
  };
}
