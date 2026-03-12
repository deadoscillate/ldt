import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCourseProjectCliUsage,
  parseCourseProjectCliArgs,
} from "@/lib/project/cli";

test("CLI parser accepts explicit project build arguments", () => {
  const parsed = parseCourseProjectCliArgs([
    "export",
    "--project",
    "course-projects/security-awareness",
    "--template",
    "phishing-awareness",
    "--variant",
    "k12-district",
    "--theme",
    "default",
    "--mode",
    "validation",
    "--json-report",
    "tmp/report.json",
    "--fail-on-warning",
  ]);

  assert.equal(parsed.command, "export");
  assert.equal(parsed.projectPath, "course-projects/security-awareness");
  assert.equal(parsed.exportMode, "validation");
  assert.equal(parsed.jsonReportPath, "tmp/report.json");
  assert.equal(parsed.failOnWarning, true);
  assert.deepEqual(parsed.selection, {
    templateId: "phishing-awareness",
    variantId: "k12-district",
    themeId: "default",
  });
});

test("CLI parser accepts target shorthand for CI workflows", () => {
  const parsed = parseCourseProjectCliArgs([
    "export",
    "--project",
    "course-projects/security-awareness",
    "--target",
    "phishing-awareness/k12-district/default",
    "--output",
    ".ci-build",
  ]);

  assert.equal(parsed.command, "export");
  assert.equal(parsed.outputPath, ".ci-build");
  assert.deepEqual(parsed.selection, {
    templateId: "phishing-awareness",
    variantId: "k12-district",
    themeId: "default",
  });
});

test("CLI usage explains available commands", () => {
  const usage = buildCourseProjectCliUsage();

  assert.match(usage, /validate/);
  assert.match(usage, /export-all/);
  assert.match(usage, /--project/);
  assert.match(usage, /--target/);
});

test("CLI parser rejects missing project argument", () => {
  assert.throws(() => parseCourseProjectCliArgs(["validate"]), /--project/);
});
