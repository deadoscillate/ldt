import assert from "node:assert/strict";
import test from "node:test";

import yaml from "js-yaml";

import {
  extractSharedModuleFromYaml,
  insertSharedModuleIntoYaml,
} from "@/lib/module-library/workflows";

test("shared module insert appends a pinned include with variable overrides", () => {
  const nextSource = insertSharedModuleIntoYaml(
    `
id: source-course
title: Source course
description: Test source
start: intro
passingScore: 0
nodes:
  - id: intro
    type: content
    title: Intro
    next: complete
  - id: complete
    type: result
    title: Done
    outcome: passed
`,
    "reporting_procedure",
    "1.0.0",
    {
      reportingChannel: "support@example.com",
      reportingLabel: "approved route",
    }
  );
  const parsed = yaml.load(nextSource) as {
    nodes: Array<Record<string, unknown>>;
  };

  assert.equal(parsed.nodes.length, 3);
  assert.deepEqual(parsed.nodes[2], {
    include: {
      module: "reporting_procedure",
      version: "1.0.0",
      with: {
        reportingChannel: "support@example.com",
        reportingLabel: "approved route",
      },
    },
  });
});

test("shared module extraction replaces a step with a pinned include and emits module source", () => {
  const extracted = extractSharedModuleFromYaml({
    source: `
id: extract-course
title: Extract course
description: Test course
start: intro
passingScore: 0
nodes:
  - id: intro
    type: content
    title: Intro
    body: Reusable intro copy
    next: complete
  - id: complete
    type: result
    title: Done
    outcome: passed
`,
    nodeId: "intro",
    moduleId: "shared_intro",
    title: "Shared intro",
    description: "Reusable introduction",
    category: "test",
    tags: ["intro", "shared"],
    lastUpdated: "2026-03-12",
  });
  const nextSource = yaml.load(extracted.nextSource) as {
    nodes: Array<Record<string, unknown>>;
  };
  const moduleSource = yaml.load(extracted.moduleSource) as {
    id: string;
    version: string;
    nodes: Array<Record<string, unknown>>;
  };
  const registryEntry = yaml.load(extracted.registryEntrySource) as {
    id: string;
    path: string;
  };

  assert.deepEqual(nextSource.nodes[0], {
    include: {
      module: "shared_intro",
      version: "1.0.0",
    },
  });
  assert.equal(moduleSource.id, "shared_intro");
  assert.equal(moduleSource.version, "1.0.0");
  assert.equal((moduleSource.nodes[0] as { id: string }).id, "intro");
  assert.equal(registryEntry.id, "shared_intro");
  assert.equal(registryEntry.path, "modules/shared_intro.yaml");
});
