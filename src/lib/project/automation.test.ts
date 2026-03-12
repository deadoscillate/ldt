import assert from "node:assert/strict";
import test from "node:test";

import { runCourseProjectAutomation } from "@/lib/project/automation";
import { loadCourseProjects } from "@/lib/project/load-course-projects";

test("project automation validates and reports a default target without packaging", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "customer-service");

  assert.ok(project);

  const run = await runCourseProjectAutomation(project, "validate", {
    generatedAt: "2026-03-12T20:00:00.000Z",
  });

  assert.equal(run.report.success, true);
  assert.equal(run.report.totalTargets, 1);
  assert.equal(run.report.buildsGenerated, 0);
  assert.equal(run.report.manifestsGenerated, 0);
  assert.ok(run.report.outputPaths.includes("build/ci-build-report.json"));
  assert.ok(run.summaryMarkdown.includes("Course Project Build Summary"));
  assert.equal(run.report.targets[0]?.stages.find((stage) => stage.id === "package-scorm-build")?.status, "skipped");
});

test("project automation exports deterministic project build artifacts and reports", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const run = await runCourseProjectAutomation(project, "export", {
    generatedAt: "2026-03-12T20:00:00.000Z",
    selection: {
      templateId: "phishing-awareness",
      variantId: "k12-district",
      themeId: "default",
    },
  });

  assert.equal(run.report.success, true);
  assert.equal(run.report.buildsGenerated, 1);
  assert.equal(run.report.manifestsGenerated, 1);
  assert.ok(
    run.artifacts.some(
      (artifact) =>
        artifact.path ===
        "build/scorm12/phishing-awareness__k12-district__default__scorm12.zip"
    )
  );
  assert.ok(
    run.artifacts.some(
      (artifact) =>
        artifact.path ===
        "build/scorm12/phishing-awareness__k12-district__default.build-manifest.json"
    )
  );
  assert.equal(
    run.report.targets[0]?.buildManifest?.projectId,
    "security-awareness"
  );
});

test("project automation export-all builds every valid variant theme combination", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const run = await runCourseProjectAutomation(project, "export-all", {
    generatedAt: "2026-03-12T20:00:00.000Z",
    exportMode: "validation",
  });

  assert.equal(run.report.totalTargets, 6);
  assert.equal(run.report.successfulBuilds, 6);
  assert.equal(run.report.failedBuilds, 0);
  assert.equal(run.report.skippedBuilds, 0);
  assert.equal(run.report.buildsGenerated, 6);
  assert.ok(
    run.artifacts.some((artifact) => artifact.path === "build/build-manifest.json")
  );
});

test("project automation can skip invalid build selections and continue", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const run = await runCourseProjectAutomation(project, "export-all", {
    generatedAt: "2026-03-12T20:00:00.000Z",
    selections: [
      {
        templateId: "phishing-awareness",
        variantId: "k12-district",
        themeId: "default",
      },
      {
        templateId: "phishing-awareness",
        variantId: "missing-variant",
        themeId: "default",
      },
    ],
  });

  assert.equal(run.report.totalTargets, 2);
  assert.equal(run.report.successfulBuilds, 1);
  assert.equal(run.report.skippedBuilds, 1);
  assert.equal(run.report.failedBuilds, 0);
  assert.ok(
    run.report.targets.some(
      (target) =>
        target.targetKey === "phishing-awareness/missing-variant/default" &&
        target.skipped
    )
  );
});

test("fail-on-warning turns non-fatal project warnings into a failing report", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "customer-service");

  assert.ok(project);

  const warnedProject = {
    ...project,
    sourceFiles: project.sourceFiles.filter((file) => file.path !== ".gitignore"),
  };
  const run = await runCourseProjectAutomation(warnedProject, "validate", {
    generatedAt: "2026-03-12T20:00:00.000Z",
    failOnWarning: true,
  });

  assert.equal(run.report.warningCount > 0, true);
  assert.equal(run.report.success, false);
});
