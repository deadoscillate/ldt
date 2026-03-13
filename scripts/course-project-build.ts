import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCourseProjectCliUsage,
  parseCourseProjectCliArgs,
  type ParsedCourseProjectCliArgs,
} from "@/lib/project/cli";
import { listCourseProjectBuildSelections } from "@/lib/project/build";
import {
  detectAffectedBuildTargets,
  runAffectedRebuild,
} from "@/lib/project/affected";
import { loadCourseProjectFromDirectory, loadCourseProjects } from "@/lib/project/load-course-projects";
import { runCourseProjectAutomation } from "@/lib/project/automation";
import type { CourseProjectBuildCommand } from "@/lib/project/automation";
import { loadModuleLibrary } from "@/lib/module-library/load";
import type { CourseProject } from "@/lib/project/schema";
import {
  runAllCourseProjectLogicTests,
  runCourseProjectLogicTests,
} from "@/lib/project/testing";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function resolveProjectDirectory(
  project: CourseProject,
  explicitProjectPath: string | null
): string {
  if (explicitProjectPath) {
    return path.resolve(process.cwd(), explicitProjectPath);
  }

  return path.resolve(process.cwd(), "course-projects", project.id);
}

function resolveArtifactPath(
  projectDirectory: string,
  projectBuildDirectory: string,
  outputRoot: string,
  artifactPath: string
): string {
  const normalizedArtifactPath = normalizePath(artifactPath);
  const normalizedBuildDirectory = normalizePath(projectBuildDirectory);
  const relativePath = normalizedArtifactPath.startsWith(`${normalizedBuildDirectory}/`)
    ? normalizedArtifactPath.slice(normalizedBuildDirectory.length + 1)
    : path.basename(normalizedArtifactPath);

  return path.resolve(projectDirectory, outputRoot, relativePath);
}

async function writeArtifact(
  absolutePath: string,
  contents: string | Blob
): Promise<void> {
  await mkdir(path.dirname(absolutePath), { recursive: true });

  if (typeof contents === "string") {
    await writeFile(absolutePath, contents, "utf8");
    return;
  }

  await writeFile(absolutePath, Buffer.from(await contents.arrayBuffer()));
}

function printStages(): void {
  // Per-target stage output happens inline below.
}

function printProjectRun(projectId: string, report: { targets: readonly any[]; warnings: readonly any[]; errors: readonly any[]; success: boolean; }): void {
  console.log(`[project] ${projectId} -> ${report.success ? "success" : "failed"}`);

  for (const target of report.targets) {
    console.log(
      `[target] ${projectId}/${target.targetKey} -> ${
        target.success ? "success" : target.skipped ? "skipped" : "failed"
      }`
    );
    target.stages.forEach((stage: any) => {
      console.log(`  [${stage.status}] ${stage.label}: ${stage.details}`);
    });
    target.warnings.forEach((warning: any) => {
      console.log(`  [warning] ${warning.message}`);
    });
    target.errors.forEach((error: any) => {
      console.log(`  [error] ${error.message}`);
    });
  }

  report.warnings.forEach((warning: any) => {
    console.log(`[warning] ${warning.message}`);
  });
  report.errors.forEach((error: any) => {
    console.log(`[error] ${error.message}`);
  });
}

function printLogicTestRun(report: {
  projectId: string;
  success: boolean;
  results: readonly any[];
  warnings: readonly any[];
  errors: readonly any[];
  coverage: readonly any[];
}): void {
  console.log(`[tests] ${report.projectId} -> ${report.success ? "success" : "failed"}`);

  report.results.forEach((result: any) => {
    console.log(
      `[test] ${report.projectId}/${result.targetKey} :: ${result.suiteId}/${result.testId} -> ${
        result.success ? "pass" : "fail"
      }`
    );
    result.errors.forEach((error: any) => {
      console.log(`  [error] ${error.message}`);
    });
    result.warnings.forEach((warning: any) => {
      console.log(`  [warning] ${warning.message}`);
    });
  });

  report.coverage.forEach((coverage: any) => {
    console.log(
      `[coverage] ${report.projectId}/${coverage.targetKey} -> visited ${coverage.visitedSteps.length} step(s), untested interactive steps: ${
        coverage.untestedInteractiveSteps.length > 0
          ? coverage.untestedInteractiveSteps.join(", ")
          : "none"
      }`
    );
  });

  report.warnings.forEach((warning: any) => {
    console.log(`[warning] ${warning.message}`);
  });
  report.errors.forEach((error: any) => {
    console.log(`[error] ${error.message}`);
  });
}

async function runStandardCommand(
  parsedArgs: ParsedCourseProjectCliArgs
): Promise<void> {
  const projectDirectory = path.resolve(process.cwd(), parsedArgs.projectPath!);
  const project = await loadCourseProjectFromDirectory(projectDirectory);
  const outputRoot = parsedArgs.outputPath ?? project.buildDirectory;
  const moduleLibrary = await loadModuleLibrary();

  if (parsedArgs.command === "clean") {
    const buildOutputDirectory = path.resolve(projectDirectory, outputRoot);

    await rm(buildOutputDirectory, {
      recursive: true,
      force: true,
    });

    console.log(`[clean] Removed build output directory: ${buildOutputDirectory}`);
    return;
  }

  if (parsedArgs.command === "affected") {
    throw new Error('Internal error: "affected" should not reach the standard project build runner.');
  }

  if (parsedArgs.command === "test") {
    const testRun = runCourseProjectLogicTests(project, {
      selection: parsedArgs.selection,
      generatedAt: new Date().toISOString(),
      moduleLibrary,
    });

    printLogicTestRun(testRun.report);

    for (const artifact of testRun.artifacts) {
      const artifactPath = resolveArtifactPath(
        projectDirectory,
        project.buildDirectory,
        outputRoot,
        artifact.path
      );
      await writeArtifact(artifactPath, artifact.contents);
      console.log(`[write] ${artifact.kind}: ${artifactPath}`);
    }

    if (parsedArgs.jsonReportPath) {
      const explicitReportPath = path.resolve(process.cwd(), parsedArgs.jsonReportPath);
      await writeArtifact(explicitReportPath, JSON.stringify(testRun.report, null, 2));
      console.log(`[write] json-report: ${explicitReportPath}`);
    }

    console.log("");
    console.log(`Project: ${testRun.report.projectId} (${testRun.report.projectVersion})`);
    console.log(`Test suites: ${testRun.report.totalSuites}`);
    console.log(`Total tests: ${testRun.report.totalTests}`);
    console.log(`Passed: ${testRun.report.passedTests}`);
    console.log(`Failed: ${testRun.report.failedTests}`);
    console.log(`Warnings: ${testRun.report.warningCount}`);
    console.log(`Errors: ${testRun.report.errorCount}`);
    console.log(`Overall result: ${testRun.report.success ? "success" : "failed"}`);

    if (!testRun.report.success) {
      process.exitCode = 1;
    }

    return;
  }

  const command: CourseProjectBuildCommand =
    parsedArgs.command === "export" && parsedArgs.all
      ? "export-all"
      : parsedArgs.command;
  const run = await runCourseProjectAutomation(project, command, {
    selection: parsedArgs.selection,
    exportMode: parsedArgs.exportMode,
    failOnWarning: parsedArgs.failOnWarning,
    moduleLibrary,
    selections:
      parsedArgs.all && command !== "export-all"
        ? listCourseProjectBuildSelections(project)
        : undefined,
  });

  printStages();
  printProjectRun(project.id, run.report);

  for (const artifact of run.artifacts) {
    const artifactPath = resolveArtifactPath(
      projectDirectory,
      project.buildDirectory,
      outputRoot,
      artifact.path
    );
    await writeArtifact(artifactPath, artifact.contents);
    console.log(`[write] ${artifact.kind}: ${artifactPath}`);
  }

  if (parsedArgs.jsonReportPath) {
    const explicitReportPath = path.resolve(process.cwd(), parsedArgs.jsonReportPath);
    await writeArtifact(explicitReportPath, JSON.stringify(run.report, null, 2));
    console.log(`[write] json-report: ${explicitReportPath}`);
  }

  console.log("");
  console.log(`Project: ${run.report.projectId} (${run.report.projectVersion})`);
  console.log(`Command: ${run.report.command}`);
  console.log(`Export mode: ${run.report.exportMode}`);
  console.log(`Targets: ${run.report.totalTargets}`);
  console.log(`Successful builds: ${run.report.successfulBuilds}`);
  console.log(`Failed builds: ${run.report.failedBuilds}`);
  console.log(`Skipped builds: ${run.report.skippedBuilds}`);
  console.log(`Warnings: ${run.report.warningCount}`);
  console.log(`Errors: ${run.report.errorCount}`);
  console.log(`Builds generated: ${run.report.buildsGenerated}`);
  console.log(`Manifests generated: ${run.report.manifestsGenerated}`);
  console.log(`Overall result: ${run.report.success ? "success" : "failed"}`);

  if (!run.report.success) {
    process.exitCode = 1;
  }
}

async function runAffectedCommand(
  parsedArgs: ParsedCourseProjectCliArgs
): Promise<void> {
  const moduleLibrary = await loadModuleLibrary();
  const projects = parsedArgs.projectPath
    ? [await loadCourseProjectFromDirectory(path.resolve(process.cwd(), parsedArgs.projectPath))]
    : await loadCourseProjects();
  const affectedTargets = detectAffectedBuildTargets(projects, {
    changedInputs: parsedArgs.changedInputs,
    moduleIds: parsedArgs.moduleIds,
    projectId: parsedArgs.projectPath ? projects[0]?.id ?? null : null,
    moduleLibrary,
  });

  console.log(`[affected] Matched ${affectedTargets.length} build target(s).`);
  affectedTargets.forEach((target) => {
    console.log(`  - ${target.projectId}/${target.targetKey}: ${target.reason}`);
  });

  const run = await runAffectedRebuild(projects, {
    changedInputs: parsedArgs.changedInputs,
    moduleIds: parsedArgs.moduleIds,
    projectId: parsedArgs.projectPath ? projects[0]?.id ?? null : null,
    moduleLibrary,
    exportMode: parsedArgs.exportMode,
    failOnWarning: parsedArgs.failOnWarning,
  });

  for (const projectRun of run.projectRuns) {
    printProjectRun(projectRun.report.projectId, projectRun.report);
  }

  for (const projectRun of run.projectRuns) {
    const owningProject =
      projects.find((project) => project.id === projectRun.report.projectId) ?? null;

    if (!owningProject) {
      continue;
    }

    const projectDirectory = resolveProjectDirectory(
      owningProject,
      parsedArgs.projectPath
    );
    const outputRoot = parsedArgs.outputPath ?? owningProject.buildDirectory;

    for (const artifact of projectRun.artifacts) {
      const artifactPath = resolveArtifactPath(
        projectDirectory,
        owningProject.buildDirectory,
        outputRoot,
        artifact.path
      );
      await writeArtifact(artifactPath, artifact.contents);
      console.log(`[write] ${artifact.kind}: ${artifactPath}`);
    }
  }

  const summaryRoot = parsedArgs.projectPath
    ? path.resolve(
        resolveProjectDirectory(projects[0]!, parsedArgs.projectPath),
        parsedArgs.outputPath ?? projects[0]!.buildDirectory
      )
    : path.resolve(process.cwd(), parsedArgs.outputPath ?? "build/affected");
  const manifestPath = path.join(summaryRoot, "affected-rebuild-manifest.json");
  const summaryPath = path.join(summaryRoot, "affected-summary.md");
  const reportPath =
    parsedArgs.jsonReportPath !== null
      ? path.resolve(process.cwd(), parsedArgs.jsonReportPath)
      : path.join(summaryRoot, "affected-report.json");

  await writeArtifact(manifestPath, JSON.stringify(run.manifest, null, 2));
  await writeArtifact(summaryPath, run.summaryMarkdown);
  await writeArtifact(reportPath, JSON.stringify(run.report, null, 2));

  console.log(`[write] aggregate-manifest: ${manifestPath}`);
  console.log(`[write] summary-markdown: ${summaryPath}`);
  console.log(`[write] json-report: ${reportPath}`);

  console.log("");
  console.log(`Affected targets: ${run.report.totalAffectedTargets}`);
  console.log(`Successful builds: ${run.report.successfulBuilds}`);
  console.log(`Failed builds: ${run.report.failedBuilds}`);
  console.log(`Skipped builds: ${run.report.skippedBuilds}`);
  console.log(`Warnings: ${run.report.warningCount}`);
  console.log(`Errors: ${run.report.errorCount}`);
  console.log(`Overall result: ${run.report.success ? "success" : "failed"}`);

  if (parsedArgs.runTests) {
    const testRuns = projects.map((project) => {
      const selections = affectedTargets
        .filter((target) => target.projectId === project.id)
        .map((target) => target.selection);

      return runCourseProjectLogicTests(project, {
        selections,
        generatedAt: run.report.generatedAt,
        moduleLibrary,
      });
    });

    const testRoot = path.join(summaryRoot, "tests");

    for (const testRun of testRuns) {
      printLogicTestRun(testRun.report);

      for (const artifact of testRun.artifacts) {
        const artifactPath = path.join(
          testRoot,
          testRun.report.projectId,
          path.basename(artifact.path)
        );
        await writeArtifact(artifactPath, artifact.contents);
        console.log(`[write] ${artifact.kind}: ${artifactPath}`);
      }
    }

    const aggregateTestReport = {
      generatedAt: run.report.generatedAt,
      success: testRuns.every((testRun) => testRun.report.success),
      projects: testRuns.map((testRun) => testRun.report),
    };
    const aggregateTestReportPath = path.join(testRoot, "affected-course-test-report.json");
    const aggregateTestSummaryPath = path.join(testRoot, "affected-course-test-summary.md");

    await writeArtifact(
      aggregateTestReportPath,
      JSON.stringify(aggregateTestReport, null, 2)
    );
    await writeArtifact(
      aggregateTestSummaryPath,
      testRuns.map((testRun) => testRun.summaryMarkdown).join("\n\n")
    );

    console.log(`[write] logic-test-report: ${aggregateTestReportPath}`);
    console.log(`[write] logic-test-summary: ${aggregateTestSummaryPath}`);

    if (!aggregateTestReport.success) {
      process.exitCode = 1;
    }
  }

  if (!run.report.success) {
    process.exitCode = 1;
  }
}

async function runAllProjectsTestCommand(
  parsedArgs: ParsedCourseProjectCliArgs
): Promise<void> {
  const projects = await loadCourseProjects();
  const moduleLibrary = await loadModuleLibrary();
  const runs = runAllCourseProjectLogicTests(projects, {
    generatedAt: new Date().toISOString(),
    moduleLibrary,
  });
  let success = true;
  const aggregateReport = {
    generatedAt: new Date().toISOString(),
    success: true,
    projects: [] as typeof runs[number]["report"][],
  };

  for (const run of runs) {
    const project =
      projects.find((candidate) => candidate.id === run.report.projectId) ?? null;

    if (!project) {
      continue;
    }

    const projectDirectory = resolveProjectDirectory(project, null);
    const outputRoot = project.buildDirectory;

    printLogicTestRun(run.report);

    for (const artifact of run.artifacts) {
      const artifactPath = resolveArtifactPath(
        projectDirectory,
        outputRoot,
        outputRoot,
        artifact.path
      );
      await writeArtifact(artifactPath, artifact.contents);
      console.log(`[write] ${artifact.kind}: ${artifactPath}`);
    }

    success = success && run.report.success;
    aggregateReport.projects.push(run.report);
  }

  aggregateReport.success = success;

  if (parsedArgs.jsonReportPath) {
    const explicitReportPath = path.resolve(process.cwd(), parsedArgs.jsonReportPath);
    await writeArtifact(explicitReportPath, JSON.stringify(aggregateReport, null, 2));
    console.log(`[write] json-report: ${explicitReportPath}`);
  }

  if (!success) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  let parsedArgs: ParsedCourseProjectCliArgs;

  try {
    parsedArgs = parseCourseProjectCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Invalid course project build arguments."
    );
    console.error("");
    console.error(buildCourseProjectCliUsage());
    process.exitCode = 1;
    return;
  }

  try {
    if (parsedArgs.command === "affected") {
      await runAffectedCommand(parsedArgs);
      return;
    }

    if (parsedArgs.command === "test" && parsedArgs.allProjects) {
      await runAllProjectsTestCommand(parsedArgs);
      return;
    }

    await runStandardCommand(parsedArgs);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Course project build command failed."
    );
    process.exitCode = 1;
  }
}

void main();
