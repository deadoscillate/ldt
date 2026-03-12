import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScormExportPlan,
  buildScormFileName,
} from "@/lib/export/scorm-export";
import { parseAndCompileCourse } from "@/lib/course/parse";
import { buildScormManifest } from "@/lib/scorm/manifest";
import { runScormExportPreflight } from "@/lib/export/scorm-preflight";

const scoredCourse = parseAndCompileCourse(`
id: scorm-export-check
title: SCORM Export Check
start: intro
passingScore: 5
nodes:
  - id: intro
    type: content
    title: Welcome
    body: Start here.
    next: quiz
  - id: quiz
    type: quiz
    title: Quiz
    question: Choose the safe action.
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: failed
    options:
      - id: correct
        label: Report the phishing email
        correct: true
      - id: wrong
        label: Click the link
        correct: false
  - id: passed
    type: result
    title: Passed
    outcome: passed
    body: Passed.
  - id: failed
    type: result
    title: Failed
    outcome: failed
    body: Failed.
`);

test("export plan toggles diagnostics and package contents by export mode", () => {
  const builtAt = "2026-03-12T12:00:00.000Z";
  const standardPlan = buildScormExportPlan(scoredCourse, {
    mode: "standard",
    builtAt,
  });
  const validationPlan = buildScormExportPlan(scoredCourse, {
    mode: "validation",
    builtAt,
  });

  assert.equal(standardPlan.metadata.exportMode, "standard");
  assert.equal(standardPlan.metadata.diagnosticsEnabled, false);
  assert.ok(standardPlan.metadata.packageContents.includes("build-manifest.json"));
  assert.ok(!standardPlan.metadata.packageContents.includes("validation-notes.txt"));
  assert.match(
    standardPlan.artifacts.find((artifact) => artifact.path === "assets/runtime.js")!.contents,
    /"diagnosticsEnabled":false/
  );

  assert.equal(validationPlan.metadata.exportMode, "validation");
  assert.equal(validationPlan.metadata.diagnosticsEnabled, true);
  assert.ok(validationPlan.metadata.packageContents.includes("validation-notes.txt"));
  assert.ok(validationPlan.artifacts.some((artifact) => artifact.path === "build-manifest.json"));
  assert.match(
    validationPlan.artifacts.find((artifact) => artifact.path === "assets/runtime.js")!.contents,
    /"diagnosticsEnabled":true/
  );
  assert.match(validationPlan.validationNotes, /Moodle/);
  assert.equal(buildScormFileName(scoredCourse, { mode: "validation" }), "scorm-export-check-scorm12-validation.zip");
});

test("export plan metadata and preflight mark scored result-driven courses ready for LMS validation", () => {
  const plan = buildScormExportPlan(scoredCourse, {
    mode: "validation",
    builtAt: "2026-03-12T12:00:00.000Z",
  });

  assert.equal(plan.metadata.courseId, "scorm-export-check");
  assert.equal(plan.metadata.courseTitle, "SCORM Export Check");
  assert.equal(plan.metadata.builtAt, "2026-03-12T12:00:00.000Z");
  assert.equal(plan.metadata.preflight.ready, true);
  assert.ok(plan.metadata.preflight.checks.every((check) => check.passed));
});

test("preflight flags missing package artifacts before LMS validation", () => {
  const preflight = runScormExportPreflight({
    course: scoredCourse,
    manifest: buildScormManifest(scoredCourse),
    packageContents: ["imsmanifest.xml", "index.html", "assets/runtime.css"],
    exportMode: "validation",
  });

  assert.equal(preflight.ready, false);
  assert.equal(
    preflight.checks.find((check) => check.id === "course-json")?.passed,
    false
  );
  assert.equal(
    preflight.checks.find((check) => check.id === "diagnostics-mode")?.passed,
    false
  );
});
