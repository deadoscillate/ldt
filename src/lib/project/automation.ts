import {
  exportCourseProjectBuild,
  listCourseProjectBuildSelections,
  resolveCourseProjectBuildSelection,
  type CourseProjectBuildSelection,
} from "@/lib/project/build";
import type { CourseProject } from "@/lib/project/schema";
import type {
  ScormBuildManifest,
  ScormExportMode,
} from "@/lib/export/scorm-export";
import type { ProjectBuildDependencyGraph } from "@/lib/module-library/dependency";
import type { SharedModuleLibrary } from "@/lib/module-library/schema";

export type CourseProjectBuildCommand =
  | "validate"
  | "compile"
  | "export"
  | "export-all"
  | "manifest"
  | "clean";

export type CourseProjectBuildIssueSeverity = "warning" | "error";

export interface CourseProjectBuildIssue {
  severity: CourseProjectBuildIssueSeverity;
  code: string;
  message: string;
  targetKey?: string | null;
}

export interface CourseProjectBuildStage {
  id:
    | "load-project"
    | "validate-project"
    | "validate-source-schema"
    | "resolve-template-inputs"
    | "normalize-canonical"
    | "validate-graph"
    | "generate-preview-model"
    | "package-scorm-build"
    | "generate-build-manifest";
  label: string;
  status: "pending" | "success" | "failed" | "skipped";
  details: string;
}

export interface CourseProjectBuildArtifactPlan {
  path: string;
  kind:
    | "preview-model"
    | "scorm-package"
    | "build-manifest"
    | "dependency-graph"
    | "aggregate-manifest"
    | "json-report"
    | "summary-markdown";
  contents: string | Blob;
}

export interface CourseProjectBuildTargetRecord {
  targetKey: string;
  templateId: string;
  templateTitle: string | null;
  variantId: string;
  variantTitle: string | null;
  themeId: string;
  themeName: string | null;
  courseId: string | null;
  courseTitle: string | null;
  skipped: boolean;
  success: boolean;
  warnings: readonly CourseProjectBuildIssue[];
  errors: readonly CourseProjectBuildIssue[];
  stages: readonly CourseProjectBuildStage[];
  outputFiles: readonly string[];
  outputFileName: string | null;
  buildManifest: ScormBuildManifest | null;
  previewModelPath: string | null;
  packageContents: readonly string[];
  dependencyGraph: ProjectBuildDependencyGraph | null;
}

export interface CourseProjectBuildRunReport {
  command: CourseProjectBuildCommand;
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  generatedAt: string;
  exportMode: ScormExportMode;
  failOnWarning: boolean;
  success: boolean;
  totalTargets: number;
  successfulBuilds: number;
  failedBuilds: number;
  skippedBuilds: number;
  warningCount: number;
  errorCount: number;
  buildsGenerated: number;
  manifestsGenerated: number;
  outputPaths: readonly string[];
  warnings: readonly CourseProjectBuildIssue[];
  errors: readonly CourseProjectBuildIssue[];
  targets: readonly CourseProjectBuildTargetRecord[];
}

export interface CourseProjectAutomationRun {
  report: CourseProjectBuildRunReport;
  artifacts: readonly CourseProjectBuildArtifactPlan[];
  summaryMarkdown: string;
}

export interface CourseProjectAutomationOptions {
  selection?: Partial<CourseProjectBuildSelection> | null;
  selections?: readonly CourseProjectBuildSelection[];
  exportMode?: ScormExportMode;
  generatedAt?: string;
  failOnWarning?: boolean;
  moduleLibrary?: SharedModuleLibrary | null;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function basename(value: string): string {
  return normalizePath(value).split("/").pop() ?? value;
}

function createStage(
  id: CourseProjectBuildStage["id"],
  label: string
): CourseProjectBuildStage {
  return {
    id,
    label,
    status: "pending",
    details: "Waiting for prior stage.",
  };
}

function createStages(): CourseProjectBuildStage[] {
  return [
    createStage("load-project", "Load project"),
    createStage("validate-project", "Validate project structure"),
    createStage("validate-source-schema", "Validate source schema"),
    createStage("resolve-template-inputs", "Resolve template, variables, theme, and modules"),
    createStage("normalize-canonical", "Normalize canonical model"),
    createStage("validate-graph", "Validate graph and references"),
    createStage("generate-preview-model", "Generate preview model"),
    createStage("package-scorm-build", "Package SCORM build"),
    createStage("generate-build-manifest", "Generate build manifest"),
  ];
}

function setStage(
  stages: CourseProjectBuildStage[],
  id: CourseProjectBuildStage["id"],
  status: CourseProjectBuildStage["status"],
  details: string
): void {
  const stage = stages.find((candidate) => candidate.id === id);

  if (!stage) {
    return;
  }

  stage.status = status;
  stage.details = details;
}

function buildTargetKey(selection: CourseProjectBuildSelection): string {
  return [selection.templateId, selection.variantId, selection.themeId].join("/");
}

function buildArtifactBaseName(selection: CourseProjectBuildSelection): string {
  return [
    safeFileName(selection.templateId || "template"),
    safeFileName(selection.variantId || "variant"),
    safeFileName(selection.themeId || "theme"),
  ].join("__");
}

function buildPreviewModelPath(
  project: CourseProject,
  selection: CourseProjectBuildSelection
): string {
  return normalizePath(
    `${project.buildDirectory}/preview/${buildArtifactBaseName(selection)}.course.json`
  );
}

function buildManifestPath(
  project: CourseProject,
  selection: CourseProjectBuildSelection
): string {
  return normalizePath(
    `${project.buildDirectory}/scorm12/${buildArtifactBaseName(selection)}.build-manifest.json`
  );
}

function buildDependencyGraphPath(project: CourseProject): string {
  return normalizePath(`${project.buildDirectory}/dependency-graph.json`);
}

function buildAggregateManifestPath(project: CourseProject): string {
  return normalizePath(`${project.buildDirectory}/build-manifest.json`);
}

function buildJsonReportPath(project: CourseProject): string {
  return normalizePath(`${project.buildDirectory}/ci-build-report.json`);
}

function buildSummaryMarkdownPath(project: CourseProject): string {
  return normalizePath(`${project.buildDirectory}/build-summary.md`);
}

function buildSkippedRecord(
  selection: CourseProjectBuildSelection,
  stages: CourseProjectBuildStage[],
  warning: CourseProjectBuildIssue
): CourseProjectBuildTargetRecord {
  return {
    targetKey: buildTargetKey(selection),
    templateId: selection.templateId,
    templateTitle: null,
    variantId: selection.variantId,
    variantTitle: null,
    themeId: selection.themeId,
    themeName: null,
    courseId: null,
    courseTitle: null,
    skipped: true,
    success: false,
    warnings: [warning],
    errors: [],
    stages,
    outputFiles: [],
    outputFileName: null,
    buildManifest: null,
    previewModelPath: null,
    packageContents: [],
    dependencyGraph: null,
  };
}

function collectProjectWarnings(project: CourseProject): CourseProjectBuildIssue[] {
  const warnings: CourseProjectBuildIssue[] = [];
  const sourceFiles = new Set(project.sourceFiles.map((file) => normalizePath(file.path)));
  const buildReadmePath = normalizePath(`${project.buildDirectory}/README.md`);

  if (!sourceFiles.has(".gitignore")) {
    warnings.push({
      severity: "warning",
      code: "missing-gitignore",
      message:
        'Project source does not include ".gitignore". Build outputs should usually be ignored in Git.',
    });
  }

  if (!sourceFiles.has(buildReadmePath)) {
    warnings.push({
      severity: "warning",
      code: "missing-build-readme",
      message: `Project source does not include "${buildReadmePath}". Add one to document that build outputs are generated artifacts.`,
    });
  }

  const searchableSource = project.sourceFiles.map((file) => file.contents).join("\n");
  const projectAssetPrefix = `${normalizePath(project.assetsDirectory)}/`;

  project.binaryFiles
    .filter((file) => normalizePath(file.path).startsWith(projectAssetPrefix))
    .forEach((file) => {
      const filePath = normalizePath(file.path);
      const fileName = basename(filePath);

      if (
        !searchableSource.includes(filePath) &&
        !searchableSource.includes(fileName)
      ) {
        warnings.push({
          severity: "warning",
          code: "unused-project-asset",
          message: `Project asset "${filePath}" is not referenced by current source files.`,
        });
      }
    });

  return warnings;
}

function collectProjectErrors(project: CourseProject): CourseProjectBuildIssue[] {
  return project.validation.checks
    .filter((check) => !check.passed)
    .map((check) => ({
      severity: "error" as const,
      code: check.id,
      message: check.details,
    }));
}

function resolveSelectionWithDefaults(
  project: CourseProject,
  selection: Partial<CourseProjectBuildSelection> | null | undefined
): CourseProjectBuildSelection {
  return {
    templateId: selection?.templateId ?? project.defaultTemplateId,
    variantId: selection?.variantId ?? project.defaultVariantId,
    themeId: selection?.themeId ?? project.defaultThemeId,
  };
}

function mapPipelineStagesToBuildStages(
  stages: CourseProjectBuildStage[],
  details: {
    schema: CourseProjectBuildStage["status"];
    schemaDetails: string;
    resolve: CourseProjectBuildStage["status"];
    resolveDetails: string;
    normalize: CourseProjectBuildStage["status"];
    normalizeDetails: string;
    graph: CourseProjectBuildStage["status"];
    graphDetails: string;
    preview: CourseProjectBuildStage["status"];
    previewDetails: string;
  }
): void {
  setStage(stages, "validate-source-schema", details.schema, details.schemaDetails);
  setStage(stages, "resolve-template-inputs", details.resolve, details.resolveDetails);
  setStage(stages, "normalize-canonical", details.normalize, details.normalizeDetails);
  setStage(stages, "validate-graph", details.graph, details.graphDetails);
  setStage(stages, "generate-preview-model", details.preview, details.previewDetails);
}

async function runBuildTarget(
  project: CourseProject,
  command: CourseProjectBuildCommand,
  selection: CourseProjectBuildSelection,
  generatedAt: string,
  exportMode: ScormExportMode,
  moduleLibrary: SharedModuleLibrary | null
): Promise<{
  record: CourseProjectBuildTargetRecord;
  artifacts: CourseProjectBuildArtifactPlan[];
}> {
  const stages = createStages();
  const targetKey = buildTargetKey(selection);

  setStage(
    stages,
    "load-project",
    "success",
    `Loaded source project "${project.id}" from structured source files.`
  );

  if (!project.validation.ready) {
    setStage(
      stages,
      "validate-project",
      "failed",
      "Project structure checks failed before source compilation."
    );

    return {
      record: {
        targetKey,
        templateId: selection.templateId,
        templateTitle: null,
        variantId: selection.variantId,
        variantTitle: null,
        themeId: selection.themeId,
        themeName: null,
        courseId: null,
        courseTitle: null,
        skipped: false,
        success: false,
        warnings: [],
        errors: collectProjectErrors(project),
        stages,
        outputFiles: [],
        outputFileName: null,
        buildManifest: null,
        previewModelPath: null,
        packageContents: [],
        dependencyGraph: null,
      },
      artifacts: [],
    };
  }

  setStage(
    stages,
    "validate-project",
    "success",
    "Project metadata, references, and build-target configuration passed."
  );

  let resolvedSelection;

  try {
    resolvedSelection = resolveCourseProjectBuildSelection(project, selection, {
      moduleLibrary,
    });
  } catch (error) {
    setStage(
      stages,
      "resolve-template-inputs",
      "skipped",
      error instanceof Error ? error.message : "Invalid build selection."
    );
    setStage(
      stages,
      "package-scorm-build",
      "skipped",
      "Skipped because the selected template, variant, or theme is invalid."
    );
    setStage(
      stages,
      "generate-build-manifest",
      "skipped",
      "No build manifest was generated for an invalid selection."
    );

    return {
      record: buildSkippedRecord(selection, stages, {
        severity: "warning",
        code: "invalid-build-selection",
        message:
          error instanceof Error ? error.message : "Invalid build selection.",
        targetKey,
      }),
      artifacts: [],
    };
  }

  const pipelineWarnings = resolvedSelection.snapshot.warnings.map((message) => ({
    severity: "warning" as const,
    code: "pipeline-warning",
    message,
    targetKey,
  }));

  mapPipelineStagesToBuildStages(stages, {
    schema: resolvedSelection.snapshot.stages[1]?.status ?? "failed",
    schemaDetails:
      resolvedSelection.snapshot.stages[1]?.details ??
      "Schema validation failed.",
    resolve: resolvedSelection.snapshot.stages[2]?.status ?? "failed",
    resolveDetails:
      resolvedSelection.snapshot.stages[2]?.details ??
      "Template resolution failed.",
    normalize: resolvedSelection.snapshot.stages[3]?.status ?? "failed",
    normalizeDetails:
      resolvedSelection.snapshot.stages[3]?.details ??
      "Canonical normalization failed.",
    graph: resolvedSelection.snapshot.stages[4]?.status ?? "failed",
    graphDetails:
      resolvedSelection.snapshot.stages[4]?.details ??
      "Graph validation failed.",
    preview: resolvedSelection.snapshot.stages[5]?.status ?? "failed",
    previewDetails:
      resolvedSelection.snapshot.stages[5]?.details ??
      "Preview model generation failed.",
  });

  if (!resolvedSelection.snapshot.exportModel) {
    setStage(
      stages,
      "package-scorm-build",
      command === "validate" || command === "compile" ? "skipped" : "failed",
      "SCORM packaging is unavailable until the canonical model compiles successfully."
    );
    setStage(
      stages,
      "generate-build-manifest",
      "skipped",
      "No build manifest was generated because compilation did not reach export-ready state."
    );

    return {
      record: {
        targetKey,
        templateId: resolvedSelection.template.id,
        templateTitle: resolvedSelection.template.title,
        variantId: resolvedSelection.variant.id,
        variantTitle: resolvedSelection.variant.title,
        themeId: resolvedSelection.theme.id,
        themeName: resolvedSelection.theme.name,
        courseId: null,
        courseTitle: null,
        skipped: false,
        success: false,
        warnings: pipelineWarnings,
        errors: resolvedSelection.snapshot.errors.map((message) => ({
          severity: "error" as const,
          code: "pipeline-error",
          message,
          targetKey,
        })),
        stages,
        outputFiles: [],
        outputFileName: null,
        buildManifest: null,
        previewModelPath: null,
        packageContents: [],
        dependencyGraph: resolvedSelection.dependencyGraph,
      },
      artifacts: [],
    };
  }

  const previewModelPath = buildPreviewModelPath(project, selection);
  const targetArtifacts: CourseProjectBuildArtifactPlan[] = [];
  const outputFiles: string[] = [];

  if (command === "compile") {
    targetArtifacts.push({
      path: previewModelPath,
      kind: "preview-model",
      contents: resolvedSelection.snapshot.compiledJson,
    });
    outputFiles.push(previewModelPath);
    setStage(
      stages,
      "package-scorm-build",
      "skipped",
      "Compile command stops after generating the runtime-ready preview model."
    );
    setStage(
      stages,
      "generate-build-manifest",
      "skipped",
      "Compile command does not emit a SCORM build manifest."
    );

    return {
      record: {
        targetKey,
        templateId: resolvedSelection.template.id,
        templateTitle: resolvedSelection.template.title,
        variantId: resolvedSelection.variant.id,
        variantTitle: resolvedSelection.variant.title,
        themeId: resolvedSelection.theme.id,
        themeName: resolvedSelection.theme.name,
        courseId: resolvedSelection.snapshot.exportModel.id,
        courseTitle: resolvedSelection.snapshot.exportModel.title,
        skipped: false,
        success: true,
        warnings: pipelineWarnings,
        errors: [],
        stages,
        outputFiles,
        outputFileName: null,
        buildManifest: null,
        previewModelPath,
        packageContents: [],
        dependencyGraph: resolvedSelection.dependencyGraph,
      },
      artifacts: targetArtifacts,
    };
  }

  if (command === "validate") {
    setStage(
      stages,
      "package-scorm-build",
      "skipped",
      "Validate command does not package SCORM artifacts."
    );
    setStage(
      stages,
      "generate-build-manifest",
      "skipped",
      "Validate command does not emit a build manifest."
    );

    return {
      record: {
        targetKey,
        templateId: resolvedSelection.template.id,
        templateTitle: resolvedSelection.template.title,
        variantId: resolvedSelection.variant.id,
        variantTitle: resolvedSelection.variant.title,
        themeId: resolvedSelection.theme.id,
        themeName: resolvedSelection.theme.name,
        courseId: resolvedSelection.snapshot.exportModel.id,
        courseTitle: resolvedSelection.snapshot.exportModel.title,
        skipped: false,
        success: true,
        warnings: pipelineWarnings,
        errors: [],
        stages,
        outputFiles,
        outputFileName: null,
        buildManifest: null,
        previewModelPath: null,
        packageContents: [],
        dependencyGraph: resolvedSelection.dependencyGraph,
      },
      artifacts: [],
    };
  }

  try {
    const exported = await exportCourseProjectBuild(project, selection, {
      mode: exportMode,
      builtAt: generatedAt,
      moduleLibrary,
    });

    if (!exported.metadata.preflight.ready) {
      setStage(
        stages,
        "package-scorm-build",
        "failed",
        exported.metadata.preflight.checks
          .filter((check) => !check.passed)
          .map((check) => check.details)
          .join(" ")
      );
      setStage(
        stages,
        "generate-build-manifest",
        "skipped",
        "The build manifest was not written because SCORM preflight failed."
      );

      return {
        record: {
          targetKey,
          templateId: resolvedSelection.template.id,
          templateTitle: resolvedSelection.template.title,
          variantId: resolvedSelection.variant.id,
          variantTitle: resolvedSelection.variant.title,
          themeId: resolvedSelection.theme.id,
          themeName: resolvedSelection.theme.name,
          courseId: resolvedSelection.snapshot.exportModel.id,
          courseTitle: resolvedSelection.snapshot.exportModel.title,
          skipped: false,
          success: false,
          warnings: pipelineWarnings,
          errors: exported.metadata.preflight.checks
            .filter((check) => !check.passed)
            .map((check) => ({
              severity: "error" as const,
              code: check.id,
              message: check.details,
              targetKey,
            })),
          stages,
          outputFiles: [],
          outputFileName: null,
          buildManifest: null,
          previewModelPath: null,
          packageContents: exported.metadata.packageContents,
          dependencyGraph: resolvedSelection.dependencyGraph,
        },
        artifacts: [],
      };
    }

    const manifestPath = buildManifestPath(project, selection);
    setStage(
      stages,
      "package-scorm-build",
      "success",
      `Packaged ${exported.fileName} in ${exportMode} mode.`
    );
    setStage(
      stages,
      "generate-build-manifest",
      "success",
      `Generated build manifest for ${resolvedSelection.template.id}/${resolvedSelection.variant.id}/${resolvedSelection.theme.id}.`
    );

    if (command === "manifest") {
      targetArtifacts.push({
        path: manifestPath,
        kind: "build-manifest",
        contents: JSON.stringify(exported.buildManifest, null, 2),
      });
      outputFiles.push(manifestPath);
    } else {
      const packagePath = normalizePath(
        `${project.buildDirectory}/scorm12/${exported.fileName}`
      );
      targetArtifacts.push(
        {
          path: packagePath,
          kind: "scorm-package",
          contents: exported.blob,
        },
        {
          path: manifestPath,
          kind: "build-manifest",
          contents: JSON.stringify(exported.buildManifest, null, 2),
        }
      );
      outputFiles.push(packagePath, manifestPath);
    }

    return {
      record: {
        targetKey,
        templateId: resolvedSelection.template.id,
        templateTitle: resolvedSelection.template.title,
        variantId: resolvedSelection.variant.id,
        variantTitle: resolvedSelection.variant.title,
        themeId: resolvedSelection.theme.id,
        themeName: resolvedSelection.theme.name,
        courseId: resolvedSelection.snapshot.exportModel.id,
        courseTitle: resolvedSelection.snapshot.exportModel.title,
        skipped: false,
        success: true,
        warnings: pipelineWarnings,
        errors: [],
        stages,
        outputFiles,
        outputFileName: exported.fileName,
        buildManifest: exported.buildManifest,
        previewModelPath: null,
        packageContents: exported.metadata.packageContents,
        dependencyGraph: resolvedSelection.dependencyGraph,
      },
      artifacts: targetArtifacts,
    };
  } catch (error) {
    setStage(
      stages,
      "package-scorm-build",
      "failed",
      error instanceof Error ? error.message : "SCORM packaging failed."
    );
    setStage(
      stages,
      "generate-build-manifest",
      "skipped",
      "No build manifest was written because packaging failed."
    );

    return {
      record: {
        targetKey,
        templateId: resolvedSelection.template.id,
        templateTitle: resolvedSelection.template.title,
        variantId: resolvedSelection.variant.id,
        variantTitle: resolvedSelection.variant.title,
        themeId: resolvedSelection.theme.id,
        themeName: resolvedSelection.theme.name,
        courseId: resolvedSelection.snapshot.exportModel.id,
        courseTitle: resolvedSelection.snapshot.exportModel.title,
        skipped: false,
        success: false,
        warnings: pipelineWarnings,
        errors: [
          {
            severity: "error",
            code: "scorm-export-failed",
            message:
              error instanceof Error ? error.message : "SCORM export failed.",
            targetKey,
          },
        ],
        stages,
        outputFiles: [],
        outputFileName: null,
        buildManifest: null,
        previewModelPath: null,
        packageContents: [],
        dependencyGraph: resolvedSelection.dependencyGraph,
      },
      artifacts: [],
    };
  }
}

function buildSummaryMarkdown(report: CourseProjectBuildRunReport): string {
  const lines = [
    `# Course Project Build Summary`,
    "",
    `- Project: \`${report.projectId}\``,
    `- Version: \`${report.projectVersion}\``,
    `- Command: \`${report.command}\``,
    `- Export mode: \`${report.exportMode}\``,
    `- Generated at: \`${report.generatedAt}\``,
    `- Success: \`${report.success}\``,
    `- Targets: ${report.totalTargets}`,
    `- Successful: ${report.successfulBuilds}`,
    `- Failed: ${report.failedBuilds}`,
    `- Skipped: ${report.skippedBuilds}`,
    `- Warnings: ${report.warningCount}`,
    `- Errors: ${report.errorCount}`,
    "",
    "## Target results",
    "",
  ];

  report.targets.forEach((target) => {
    lines.push(
      `- \`${target.targetKey}\`: ${
        target.success ? "success" : target.skipped ? "skipped" : "failed"
      }${target.outputFileName ? ` -> \`${target.outputFileName}\`` : ""}`
    );
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

function buildRunReport(input: {
  command: CourseProjectBuildCommand;
  project: CourseProject;
  exportMode: ScormExportMode;
  generatedAt: string;
  failOnWarning: boolean;
  targetRecords: readonly CourseProjectBuildTargetRecord[];
  projectWarnings: readonly CourseProjectBuildIssue[];
  projectErrors: readonly CourseProjectBuildIssue[];
  outputPaths: readonly string[];
}): CourseProjectBuildRunReport {
  const warnings = [
    ...input.projectWarnings,
    ...input.targetRecords.flatMap((target) => target.warnings),
  ];
  const errors = [
    ...input.projectErrors,
    ...input.targetRecords.flatMap((target) => target.errors),
  ];
  const successfulBuilds = input.targetRecords.filter((target) => target.success).length;
  const failedBuilds = input.targetRecords.filter(
    (target) => !target.success && !target.skipped
  ).length;
  const skippedBuilds = input.targetRecords.filter((target) => target.skipped).length;
  const buildsGenerated = input.targetRecords.filter(
    (target) => target.outputFileName !== null
  ).length;
  const manifestsGenerated = input.targetRecords.filter(
    (target) => target.buildManifest !== null
  ).length;
  const success =
    errors.length === 0 &&
    failedBuilds === 0 &&
    (!input.failOnWarning || warnings.length === 0);

  return {
    command: input.command,
    projectId: input.project.id,
    projectTitle: input.project.title,
    projectVersion: input.project.version,
    generatedAt: input.generatedAt,
    exportMode: input.exportMode,
    failOnWarning: input.failOnWarning,
    success,
    totalTargets: input.targetRecords.length,
    successfulBuilds,
    failedBuilds,
    skippedBuilds,
    warningCount: warnings.length,
    errorCount: errors.length,
    buildsGenerated,
    manifestsGenerated,
    outputPaths: input.outputPaths,
    warnings,
    errors,
    targets: input.targetRecords,
  };
}

export async function runCourseProjectAutomation(
  project: CourseProject,
  command: CourseProjectBuildCommand,
  options: CourseProjectAutomationOptions = {}
): Promise<CourseProjectAutomationRun> {
  if (command === "clean") {
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const report = buildRunReport({
      command,
      project,
      exportMode: options.exportMode ?? "standard",
      generatedAt,
      failOnWarning: options.failOnWarning ?? false,
      targetRecords: [],
      projectWarnings: [],
      projectErrors: [],
      outputPaths: [],
    });
    const summaryMarkdown = buildSummaryMarkdown(report);

    return {
      report,
      artifacts: [
        {
          path: buildJsonReportPath(project),
          kind: "json-report",
          contents: JSON.stringify(report, null, 2),
        },
        {
          path: buildSummaryMarkdownPath(project),
          kind: "summary-markdown",
          contents: summaryMarkdown,
        },
      ],
      summaryMarkdown,
    };
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const exportMode = options.exportMode ?? "standard";
  const failOnWarning = options.failOnWarning ?? false;
  const projectWarnings = collectProjectWarnings(project);
  const projectErrors = collectProjectErrors(project);
  const selections =
    command === "export-all" || options.selections
      ? options.selections ?? listCourseProjectBuildSelections(project)
      : [resolveSelectionWithDefaults(project, options.selection)];

  const targetResults = await Promise.all(
    selections.map((selection) =>
      runBuildTarget(
        project,
        command,
        selection,
        generatedAt,
        exportMode,
        options.moduleLibrary ?? null
      )
    )
  );
  const targetRecords = targetResults.map((result) => result.record);
  const dependencyGraph = {
    projectId: project.id,
    projectTitle: project.title,
    projectVersion: project.version,
    generatedAt,
    targets: targetRecords
      .filter((target) => target.dependencyGraph !== null)
      .map((target) => ({
        targetKey: target.targetKey,
        courseId: target.courseId,
        courseTitle: target.courseTitle,
        sourceFiles: target.dependencyGraph?.sourceFiles ?? [],
        moduleDependencies:
          target.dependencyGraph?.moduleDependencies.map((dependency) => ({
            moduleId: dependency.moduleId,
            version: dependency.version,
            sourcePath: dependency.sourcePath,
            resolution: dependency.resolution,
            deprecated: dependency.deprecated,
          })) ?? [],
        edges: target.dependencyGraph?.edges ?? [],
      })),
  };
  const aggregateManifest = {
    projectId: project.id,
    projectTitle: project.title,
    projectVersion: project.version,
    command,
    exportMode,
    generatedAt,
    targets: targetRecords.map((target) => ({
      targetKey: target.targetKey,
      success: target.success,
      skipped: target.skipped,
      outputFileName: target.outputFileName,
      outputFiles: target.outputFiles,
      buildFingerprint: target.buildManifest?.buildFingerprint ?? null,
      validationReady: target.buildManifest?.validationReady ?? false,
      warnings: target.warnings.map((warning) => warning.message),
      errors: target.errors.map((error) => error.message),
    })),
  };
  const artifactList = [
    ...targetResults.flatMap((result) => result.artifacts),
    {
      path: buildDependencyGraphPath(project),
      kind: "dependency-graph" as const,
      contents: JSON.stringify(dependencyGraph, null, 2),
    },
    {
      path: buildAggregateManifestPath(project),
      kind: "aggregate-manifest" as const,
      contents: JSON.stringify(aggregateManifest, null, 2),
    },
  ];
  const summaryMarkdownPath = buildSummaryMarkdownPath(project);
  const jsonReportPath = buildJsonReportPath(project);
  const outputPaths = [
    ...artifactList.map((artifact) => artifact.path),
    jsonReportPath,
    summaryMarkdownPath,
  ];
  const report = buildRunReport({
    command,
    project,
    exportMode,
    generatedAt,
    failOnWarning,
    targetRecords,
    projectWarnings,
    projectErrors,
    outputPaths,
  });
  const summaryMarkdown = buildSummaryMarkdown(report);

  return {
    report,
    artifacts: [
      ...artifactList,
      {
        path: jsonReportPath,
        kind: "json-report",
        contents: JSON.stringify(report, null, 2),
      },
      {
        path: summaryMarkdownPath,
        kind: "summary-markdown",
        contents: summaryMarkdown,
      },
    ],
    summaryMarkdown,
  };
}
