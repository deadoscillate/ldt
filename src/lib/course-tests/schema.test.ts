import assert from "node:assert/strict";
import test from "node:test";

import { parseCourseLogicTestSuiteYaml } from "@/lib/course-tests/schema";

test("course logic test suites parse declarative actions and expectations", () => {
  const suite = parseCourseLogicTestSuiteYaml({
    source: `
id: phishing-tests
title: Phishing tests
target:
  templateId: phishing-awareness
tests:
  - id: pass-path
    name: Pass path
    target:
      variantId: k12-district
      themeId: default
    actions:
      - step: intro
        advance: true
      - step: report
        select: approved
    expect:
      terminalStep: passed
      scoreAtLeast: 10
      completionStatus: completed
      successStatus: passed
      variables:
        companyName: Lakeview School District
`,
    sourcePath: "tests/phishing-awareness.tests.yaml",
  });

  assert.equal(suite.id, "phishing-tests");
  assert.equal(suite.targetDefaults?.templateId, "phishing-awareness");
  assert.equal(suite.tests[0]?.actions.length, 2);
  assert.deepEqual(suite.tests[0]?.actions[1], {
    step: "report",
    select: "approved",
  });
  assert.equal(suite.tests[0]?.expect.successStatus, "passed");
});

test("course logic test suite parsing rejects invalid definitions", () => {
  assert.throws(
    () =>
      parseCourseLogicTestSuiteYaml({
        source: `
id: broken-tests
title: Broken tests
tests:
  - id: bad
    name: Bad action
    actions:
      - step: intro
    expect:
      terminalStep: passed
`,
        sourcePath: "tests/broken.tests.yaml",
      }),
    /actions\.0/
  );
});
