import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  builderCourseToYaml,
  compiledCourseToBuilderCourse,
} from "@/lib/course/builder";
import { runCoursePipeline } from "@/lib/course/pipeline";
import { buildScormExportPreview } from "@/lib/export/scorm-export";

const validSource = `
id: architecture-check
title: Architecture Check
description: Structured authoring round-trip fixture.
start: intro
passingScore: 5
templateData:
  companyName: Example Corp
nodes:
  - id: intro
    type: content
    title: Welcome
    layout: image-right
    body:
      - Welcome to {{companyName}}.
    media:
      type: image
      src: https://example.com/welcome.png
      alt: Welcome image
    left:
      title: Focus
      text: Review the workflow carefully.
    next: knowledge-check
  - id: knowledge-check
    type: question
    title: Knowledge Check
    layout: question
    prompt: Which action is safest?
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: failed
    options:
      - id: report
        label: Report the phishing message
        correct: true
      - id: click
        label: Click the link
        correct: false
  - id: passed
    type: result
    title: Passed
    layout: result
    outcome: passed
    callout:
      title: Next step
      text: Share the reporting path with your team.
    body:
      - "Final score: {{score}}"
  - id: failed
    type: result
    title: Failed
    layout: callout
    outcome: failed
    callout:
      title: Review
      text: Retry after reviewing the reporting steps.
    body:
      - Review the scenario and try again.
`;

test("pipeline stages succeed in order for a valid source definition", () => {
  const snapshot = runCoursePipeline(validSource, {
    templateDataOverrides: {
      companyName: "Example Corp",
    },
  });

  assert.equal(snapshot.failedStageId, null);
  assert.ok(snapshot.canonicalCourse);
  assert.ok(snapshot.previewModel);
  assert.ok(snapshot.exportModel);
  assert.deepEqual(
    snapshot.stages.map((stage) => stage.status),
    ["success", "success", "success", "success", "success", "success", "success"]
  );
});

test("pipeline round-trips source through the canonical model and builder projection", () => {
  const originalSnapshot = runCoursePipeline(validSource, {
    templateDataOverrides: {
      companyName: "Example Corp",
    },
  });

  assert.ok(originalSnapshot.canonicalCourse);

  const builderProjection = compiledCourseToBuilderCourse(
    originalSnapshot.canonicalCourse!
  );
  const serializedSource = builderCourseToYaml(builderProjection, {
    companyName: "Example Corp",
  });
  const roundTrippedSnapshot = runCoursePipeline(serializedSource, {
    templateDataOverrides: {
      companyName: "Example Corp",
    },
  });

  assert.equal(roundTrippedSnapshot.failedStageId, null);
  assert.deepEqual(
    roundTrippedSnapshot.canonicalCourse,
    originalSnapshot.canonicalCourse
  );
});

test("schema guardrails make unknown node fields explicit", () => {
  const invalidSource = `
id: invalid-field-course
title: Invalid Field
start: intro
nodes:
  - id: intro
    type: content
    title: Welcome
    unexpectedField: true
    body: Hello
`;

  const snapshot = runCoursePipeline(invalidSource);

  assert.equal(snapshot.failedStageId, "validate-schema");
  assert.ok(
    snapshot.errors.some((issue) =>
      issue.includes('Unknown field "unexpectedField"')
    )
  );
});

test("builder-driven canonical courses remain valid export input", () => {
  const snapshot = runCoursePipeline(validSource, {
    templateDataOverrides: {
      companyName: "Example Corp",
    },
  });
  assert.ok(snapshot.canonicalCourse);

  const builderProjection = compiledCourseToBuilderCourse(
    snapshot.canonicalCourse!
  );
  builderProjection.title = "Architecture Check Edited";
  builderProjection.nodes[0]!.title = "Welcome Updated";

  const builderSnapshot = runCoursePipeline(
    builderCourseToYaml(builderProjection, {
      companyName: "Example Corp",
    }),
    {
      templateDataOverrides: {
        companyName: "Example Corp",
      },
    }
  );

  assert.equal(builderSnapshot.previewModel?.title, "Architecture Check Edited");
  assert.equal(builderSnapshot.previewModel?.nodes.intro.title, "Welcome Updated");

  const exportPreview = buildScormExportPreview(builderSnapshot.canonicalCourse!, {
    mode: "standard",
    builtAt: "2026-03-12T12:00:00.000Z",
  });

  assert.equal(exportPreview.metadata.preflight.ready, true);
  assert.equal(exportPreview.metadata.courseId, "architecture-check");
});

test("course pipeline stays isolated from SCORM adapter code", async () => {
  const pipelinePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "course",
    "pipeline.ts"
  );
  const compilePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "course",
    "compile.ts"
  );
  const [pipelineSource, compileSource] = await Promise.all([
    readFile(pipelinePath, "utf8"),
    readFile(compilePath, "utf8"),
  ]);

  assert.equal(/\/scorm\//.test(pipelineSource), false);
  assert.equal(/\/scorm\//.test(compileSource), false);
  assert.equal(pipelineSource.includes("cmi.core"), false);
  assert.equal(compileSource.includes("cmi.core"), false);
});
