import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseAndCompileCourse, parseAndCompileCourseBundle } from "@/lib/course/parse";
import { courseSampleCatalog } from "@/lib/course/sample-catalog";

const validTemplateSource = `
id: compliance-module
title: "{{courseTitle}}"
description: "{{courseDescription}}"
start: intro
passingScore: 5
templateData:
  courseTitle: Compliance Basics
  courseDescription: Reusable compliance intro
  introLine: Practice the core reporting flow.
blocks:
  intro_block:
    - id: intro
      type: content
      title: "{{courseTitle}}"
      body:
        - "{{introLine}}"
      next: knowledge-check
  result_block:
    - id: passed
      type: result
      title: Complete
      outcome: passed
      body:
        - "Final score: {{score}} / {{maxScore}}"
nodes:
  - include: intro_block
  - id: knowledge-check
    type: quiz
    title: Knowledge check
    body: Confirm the reporting step.
    question: What should happen first?
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: passed
    options:
      - id: correct
        label: Use the approved reporting path
        correct: true
      - id: incorrect
        label: Ignore the issue for now
        correct: false
  - include: result_block
`;

test("expands reusable blocks and interpolates placeholders before compilation", () => {
  const { course, resolvedTemplate } = parseAndCompileCourseBundle(validTemplateSource);

  assert.equal(course.title, "Compliance Basics");
  assert.equal(resolvedTemplate.document.nodes[0]?.id, "intro");
  assert.equal(resolvedTemplate.document.nodes[0]?.title, "Compliance Basics");
  assert.equal(
    resolvedTemplate.document.nodes[0]?.body,
    "Practice the core reporting flow."
  );
  assert.match(resolvedTemplate.document.nodes.at(-1)?.body ?? "", /{{score}}/);
  assert.deepEqual(course.nodeOrder, ["intro", "knowledge-check", "passed"]);
});

test("reports missing placeholders with readable validation errors", () => {
  const source = `
id: missing-placeholder
title: "{{courseTitle}}"
description: Example
start: intro
passingScore: 0
templateData:
  courseTitle: Placeholder Demo
nodes:
  - id: intro
    type: content
    title: Intro
    body: "{{missingLine}}"
    next: passed
  - id: passed
    type: result
    title: Done
    outcome: passed
`;

  assert.throws(() => parseAndCompileCourse(source), (error: unknown) => {
    return (
      error instanceof Error &&
      "issues" in error &&
      Array.isArray(error.issues) &&
      error.issues.some((issue) =>
        String(issue).includes(
          'nodes[0].body references missing placeholder "missingLine".'
        )
      )
    );
  });
});

test("detects duplicate node ids after block expansion", () => {
  const source = `
id: duplicate-expansion
title: Duplicate expansion
description: Example
start: intro
passingScore: 0
blocks:
  intro_block:
    - id: intro
      type: content
      title: Intro
      next: passed
nodes:
  - include: intro_block
  - include: intro_block
  - id: passed
    type: result
    title: Done
    outcome: passed
`;

  assert.throws(() => parseAndCompileCourse(source), (error: unknown) => {
    return (
      error instanceof Error &&
      "issues" in error &&
      Array.isArray(error.issues) &&
      error.issues.some((issue) =>
        String(issue).includes('Duplicate node id "intro".')
      )
    );
  });
});

test("detects broken references after block expansion", () => {
  const source = `
id: broken-reference
title: Broken reference
description: Example
start: intro
passingScore: 0
blocks:
  intro_block:
    - id: intro
      type: content
      title: Intro
      next: missing-node
nodes:
  - include: intro_block
  - id: passed
    type: result
    title: Done
    outcome: passed
`;

  assert.throws(() => parseAndCompileCourse(source), (error: unknown) => {
    return (
      error instanceof Error &&
      "issues" in error &&
      Array.isArray(error.issues) &&
      error.issues.some((issue) =>
        String(issue).includes(
          'Node "intro" references missing node "missing-node" via "next".'
        )
      )
    );
  });
});

test("compiles all shipped sample templates successfully", async () => {
  const sampleResults = await Promise.all(
    courseSampleCatalog.map(async (sample) => {
      const filePath = path.join(
        process.cwd(),
        "src",
        "samples",
        sample.fileName
      );
      const source = await readFile(filePath, "utf8");

      return {
        sample,
        course: parseAndCompileCourse(source),
      };
    })
  );

  assert.equal(sampleResults.length, courseSampleCatalog.length);
  sampleResults.forEach(({ sample, course }) => {
    assert.equal(typeof course.title, "string", sample.title);
    assert.ok(course.nodeOrder.length > 0, sample.title);
  });
});
