import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCourseProjectCliUsage,
  parseCourseProjectCliArgs,
  type ParsedCourseProjectCliArgs,
} from "@/lib/project/cli";
import { listCourseProjectBuildSelections } from "@/lib/project/build";
import { loadCourseProjectFromDirectory } from "@/lib/project/load-course-projects";
import { runCourseProjectAutomation } from "@/lib/project/automation";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
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
  // No-op placeholder to keep CLI helpers grouped; per-target stage output happens below.
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
    const projectDirectory = path.resolve(process.cwd(), parsedArgs.projectPath);
    const project = await loadCourseProjectFromDirectory(projectDirectory);
    const outputRoot = parsedArgs.outputPath ?? project.buildDirectory;

    if (parsedArgs.command === "clean") {
      const buildOutputDirectory = path.resolve(projectDirectory, outputRoot);

      await rm(buildOutputDirectory, {
        recursive: true,
        force: true,
      });

      console.log(`[clean] Removed build output directory: ${buildOutputDirectory}`);
      return;
    }

    const command =
      parsedArgs.command === "export" && parsedArgs.all
        ? "export-all"
        : parsedArgs.command;
    const run = await runCourseProjectAutomation(project, command, {
      selection: parsedArgs.selection,
      exportMode: parsedArgs.exportMode,
      failOnWarning: parsedArgs.failOnWarning,
      selections:
        parsedArgs.all && command !== "export-all"
          ? listCourseProjectBuildSelections(project)
          : undefined,
    });

    printStages();

    for (const target of run.report.targets) {
      console.log(
        `[target] ${target.targetKey} -> ${
          target.success ? "success" : target.skipped ? "skipped" : "failed"
        }`
      );
      target.stages.forEach((stage) => {
        console.log(`  [${stage.status}] ${stage.label}: ${stage.details}`);
      });
      target.warnings.forEach((warning) => {
        console.log(`  [warning] ${warning.message}`);
      });
      target.errors.forEach((error) => {
        console.log(`  [error] ${error.message}`);
      });
    }

    for (const warning of run.report.warnings) {
      console.log(`[warning] ${warning.message}`);
    }

    for (const error of run.report.errors) {
      console.log(`[error] ${error.message}`);
    }

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
      await writeArtifact(
        explicitReportPath,
        JSON.stringify(run.report, null, 2)
      );
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
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Course project build command failed."
    );
    process.exitCode = 1;
  }
}

void main();
