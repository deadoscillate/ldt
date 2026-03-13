import assert from "node:assert/strict";
import test from "node:test";

import { parseCourseLogicTestSuiteYaml } from "@/lib/course-tests/schema";
import { loadModuleLibrary } from "@/lib/module-library/load";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { runCourseProjectLogicTests } from "@/lib/project/testing";

test("project logic tests simulate learner paths and report deterministic outcomes", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const run = runCourseProjectLogicTests(project, {
    moduleLibrary,
  });

  assert.equal(run.report.success, true);
  assert.equal(run.report.totalTests, 2);
  assert.equal(run.report.passedTests, 2);
  assert.ok(
    run.report.results.some(
      (result) =>
        result.testId === "correct-answer-passes" &&
        result.actual.pathTaken.includes("intro") &&
        result.actual.terminalStep === "passed" &&
        result.actual.score === 10 &&
        result.actionTrace.some((trace) => trace.action === "interact")
    )
  );
  assert.ok(
    run.report.coverage.some(
      (coverage) =>
        coverage.targetKey === "phishing-awareness/k12-district/default" &&
        coverage.untestedInteractiveSteps.length === 0
    )
  );
  assert.ok(
    run.artifacts.some(
      (artifact) => artifact.path === "build/tests/course-test-report.json"
    )
  );
});

test("project logic tests can be filtered to a specific build target", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);
  const project = projects.find((candidate) => candidate.id === "workplace-conduct");

  assert.ok(project);

  const run = runCourseProjectLogicTests(project, {
    selection: {
      templateId: "conduct-reporting",
      variantId: "corporate",
      themeId: "default",
    },
    moduleLibrary,
  });

  assert.equal(run.report.totalTests, 1);
  assert.equal(
    run.report.results[0]?.targetKey,
    "conduct-reporting/corporate/default"
  );
});

test("project logic tests fail with readable messages when a test definition references an invalid step", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);
  const project = projects.find((candidate) => candidate.id === "customer-service");

  assert.ok(project);

  const invalidSuite = parseCourseLogicTestSuiteYaml({
    source: `
id: invalid-customer-tests
title: Invalid customer tests
tests:
  - id: missing-step
    name: Missing step
    actions:
      - step: does-not-exist
        advance: true
    expect:
      terminalStep: passed
`,
    sourcePath: "tests/invalid.tests.yaml",
  });
  const run = runCourseProjectLogicTests(
    {
      ...project,
      logicTestSuites: [invalidSuite],
      logicTestLoadIssues: [],
    },
    {
      moduleLibrary,
    }
  );

  assert.equal(run.report.success, false);
  assert.match(
    run.report.results[0]?.errors[0]?.message ?? "",
    /does not exist/
  );
});

test("sapio-forge discovery project logic tests cover the flagship demo flow", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);
  const project = projects.find((candidate) => candidate.id === "sapio-forge-discovery");

  assert.ok(project);

  const run = runCourseProjectLogicTests(project, {
    moduleLibrary,
  });

  assert.equal(run.report.success, true);
  assert.equal(run.report.totalTests, 3);
  assert.ok(
    run.report.results.some(
      (result) =>
        result.testId === "strong-fit-path" &&
        result.actual.terminalStep === "strong-fit" &&
        result.actual.pathTaken.includes("sapio-forge-concept")
    )
  );
  assert.ok(
    run.report.results.some(
      (result) =>
        result.testId === "not-yet-path" &&
        result.actual.successStatus === "neutral"
    )
  );
});
