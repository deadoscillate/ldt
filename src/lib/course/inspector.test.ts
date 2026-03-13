import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStructureInspectorData,
  buildValidationStates,
} from "@/lib/course/inspector";
import { parseAndCompileCourse } from "@/lib/course/parse";
import type { TemplateFieldDefinition } from "@/lib/course/template";

test("validation states surface schema, reference, and template status separately", () => {
  const states = buildValidationStates(
    [
      "course.start: Value is required.",
      'Node "intro" references missing node "missing-node" via "next".',
      'Template data is missing placeholder "departmentName".',
    ],
    false
  );

  assert.deepEqual(states, [
    { label: "Schema valid", valid: false },
    { label: "References resolved", valid: false },
    { label: "Template variables resolved", valid: false },
    { label: "Ready to export", valid: false },
  ]);
});

test("structure inspector summarizes a compiled course for the studio", () => {
  const course = parseAndCompileCourse(`
id: inspector-example
title: Inspector Example
start: intro
templateData:
  companyName: Example Corp
nodes:
  - id: intro
    type: content
    title: Welcome
    layout: text
    body: Welcome to {{companyName}}.
    next: passed
  - id: passed
    type: result
    title: Complete
    layout: result
    outcome: passed
    body:
      - Finished.
`);

  const templateFields: TemplateFieldDefinition[] = [
    {
      key: "companyName",
      label: "Company Name",
      description: "",
      value: "Example Corp",
      inputType: "text",
      required: true,
      placeholder: "",
    },
  ];

  const inspectorData = buildStructureInspectorData({
    course,
    templateFields,
    errors: [],
    isReadyToExport: true,
  });

  assert.equal(inspectorData.courseId, "inspector-example");
  assert.equal(inspectorData.startNodeId, "intro");
  assert.equal(inspectorData.variableCount, 1);
  assert.equal(inspectorData.nodeCount, 2);
  assert.equal(inspectorData.sceneCount, 2);
  assert.equal(inspectorData.componentCount > 0, true);
  assert.deepEqual(inspectorData.nodeTypes, ["content", "result"]);
  assert.deepEqual(inspectorData.sceneLayouts, ["card", "result_shell"]);
  assert.ok(inspectorData.componentTypes.includes("title"));
  assert.ok(inspectorData.componentTypes.includes("result_card"));
  assert.deepEqual(
    inspectorData.validationStates.map((state) => state.valid),
    [true, true, true, true]
  );
});
