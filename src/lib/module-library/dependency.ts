import type { CourseProjectBuildSelection } from "@/lib/project/build";

export interface ModuleDependencyRecord {
  moduleId: string;
  title: string;
  version: string;
  sourcePath: string;
  category: string;
  tags: readonly string[];
  deprecated: boolean;
  requestedVersion: string | null;
  resolution: "pinned" | "latest";
  includedFrom: string;
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
  type: "course-uses-module" | "module-includes-module";
}

export interface CourseSourceDependencyGraph {
  sourceFiles: readonly string[];
  moduleDependencies: readonly ModuleDependencyRecord[];
  edges: readonly DependencyGraphEdge[];
}

export interface ProjectBuildDependencyGraph extends CourseSourceDependencyGraph {
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  targetKey: string;
  templateId: string;
  templateTitle: string;
  variantId: string;
  variantTitle: string;
  themeId: string;
  themeName: string;
  courseId: string;
  courseTitle: string;
}

export interface AffectedBuildTarget {
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  selection: CourseProjectBuildSelection;
  targetKey: string;
  courseId: string;
  courseTitle: string;
  reason: string;
  dependencyGraph: ProjectBuildDependencyGraph;
}

export interface AffectedRebuildManifestTarget {
  projectId: string;
  targetKey: string;
  courseId: string;
  courseTitle: string;
  reason: string;
  moduleDependencies: readonly string[];
}

export interface AffectedRebuildManifest {
  generatedAt: string;
  changedInputs: readonly string[];
  changedModules: readonly string[];
  affectedTargets: readonly AffectedRebuildManifestTarget[];
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

export function buildDependencyTargetKey(selection: CourseProjectBuildSelection): string {
  return [selection.templateId, selection.variantId, selection.themeId].join("/");
}

export function buildProjectBuildDependencyGraph(input: {
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  templateId: string;
  templateTitle: string;
  variantId: string;
  variantTitle: string;
  themeId: string;
  themeName: string;
  courseId: string;
  courseTitle: string;
  selection: CourseProjectBuildSelection;
  projectSourceFiles: readonly string[];
  moduleGraph: CourseSourceDependencyGraph;
}): ProjectBuildDependencyGraph {
  const sourceFiles = new Set<string>(
    input.projectSourceFiles.map((filePath) => normalizePath(filePath))
  );

  input.moduleGraph.sourceFiles.forEach((filePath) => {
    sourceFiles.add(normalizePath(filePath));
  });

  return {
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    projectVersion: input.projectVersion,
    targetKey: buildDependencyTargetKey(input.selection),
    templateId: input.templateId,
    templateTitle: input.templateTitle,
    variantId: input.variantId,
    variantTitle: input.variantTitle,
    themeId: input.themeId,
    themeName: input.themeName,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    sourceFiles: [...sourceFiles].sort((leftPath, rightPath) =>
      leftPath.localeCompare(rightPath)
    ),
    moduleDependencies: [...input.moduleGraph.moduleDependencies].sort((leftModule, rightModule) =>
      `${leftModule.moduleId}@${leftModule.version}`.localeCompare(
        `${rightModule.moduleId}@${rightModule.version}`
      )
    ),
    edges: [...input.moduleGraph.edges],
  };
}

export function buildAffectedRebuildManifest(input: {
  generatedAt: string;
  changedInputs: readonly string[];
  changedModules: readonly string[];
  targets: readonly AffectedBuildTarget[];
}): AffectedRebuildManifest {
  return {
    generatedAt: input.generatedAt,
    changedInputs: [...input.changedInputs].map(normalizePath),
    changedModules: [...input.changedModules].sort((leftModule, rightModule) =>
      leftModule.localeCompare(rightModule)
    ),
    affectedTargets: input.targets.map((target) => ({
      projectId: target.projectId,
      targetKey: target.targetKey,
      courseId: target.courseId,
      courseTitle: target.courseTitle,
      reason: target.reason,
      moduleDependencies: target.dependencyGraph.moduleDependencies.map(
        (moduleDependency) => `${moduleDependency.moduleId}@${moduleDependency.version}`
      ),
    })),
  };
}
