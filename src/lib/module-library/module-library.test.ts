import assert from "node:assert/strict";
import test from "node:test";

import { runCoursePipeline } from "@/lib/course/pipeline";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { loadModuleLibrary } from "@/lib/module-library/load";
import type { SharedModuleLibrary } from "@/lib/module-library/schema";

function createTestModuleLibrary(): SharedModuleLibrary {
  return {
    id: "test-module-library",
    title: "Test Module Library",
    description: "Test-only shared modules.",
    registryPath: "module-library/registry.yaml",
    modules: [
      {
        id: "intro_a",
        title: "Intro A",
        description: "First shared module",
        version: "1.0.0",
        category: "test",
        tags: ["test"],
        lastUpdated: "2026-03-12",
        deprecated: false,
        templateData: {},
        blocks: {},
        nodes: [
          {
            id: "intro",
            type: "content",
            title: "Intro",
            body: "Shared intro",
            next: "passed",
          },
        ],
        metadata: {},
        sourcePath: "modules/intro_a.yaml",
        registry: {
          id: "intro_a",
          version: "1.0.0",
          path: "modules/intro_a.yaml",
          title: "Intro A",
          description: "First shared module",
          category: "test",
          tags: ["test"],
          lastUpdated: "2026-03-12",
          deprecated: false,
        },
        dependencyReferences: [],
      },
      {
        id: "module_a",
        title: "Module A",
        description: "Circular dependency source A",
        version: "1.0.0",
        category: "test",
        tags: ["test"],
        lastUpdated: "2026-03-12",
        deprecated: false,
        templateData: {},
        blocks: {},
        nodes: [
          {
            include: {
              module: "module_b",
              version: "1.0.0",
            },
          },
        ],
        metadata: {},
        sourcePath: "modules/module_a.yaml",
        registry: {
          id: "module_a",
          version: "1.0.0",
          path: "modules/module_a.yaml",
          title: "Module A",
          description: "Circular dependency source A",
          category: "test",
          tags: ["test"],
          lastUpdated: "2026-03-12",
          deprecated: false,
        },
        dependencyReferences: [
          {
            moduleId: "module_b",
            version: "1.0.0",
          },
        ],
      },
      {
        id: "module_b",
        title: "Module B",
        description: "Circular dependency source B",
        version: "1.0.0",
        category: "test",
        tags: ["test"],
        lastUpdated: "2026-03-12",
        deprecated: false,
        templateData: {},
        blocks: {},
        nodes: [
          {
            include: {
              module: "module_a",
              version: "1.0.0",
            },
          },
        ],
        metadata: {},
        sourcePath: "modules/module_b.yaml",
        registry: {
          id: "module_b",
          version: "1.0.0",
          path: "modules/module_b.yaml",
          title: "Module B",
          description: "Circular dependency source B",
          category: "test",
          tags: ["test"],
          lastUpdated: "2026-03-12",
          deprecated: false,
        },
        dependencyReferences: [
          {
            moduleId: "module_a",
            version: "1.0.0",
          },
        ],
      },
    ],
  };
}

test("shared module library loads the starter registry and module source files", async () => {
  const moduleLibrary = await loadModuleLibrary();

  assert.ok(moduleLibrary);
  assert.equal(moduleLibrary.modules.length >= 5, true);
  assert.ok(
    moduleLibrary.modules.some(
      (module) =>
        module.id === "phishing_intro" && module.version === "1.0.0"
    )
  );
});

test("course pipeline resolves shared module includes into the canonical model", async () => {
  const projects = await loadCourseProjects();
  const moduleLibrary = await loadModuleLibrary();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);
  assert.ok(moduleLibrary);

  const template = project.templates.find(
    (candidate) => candidate.id === "phishing-awareness"
  );
  const variant = template?.variants.find(
    (candidate) => candidate.id === "k12-district"
  );

  assert.ok(template);
  assert.ok(variant);

  const snapshot = runCoursePipeline(template.yaml, {
    templateDataOverrides: variant.values,
    variableSchema: template.variableSchema,
    moduleLibrary,
  });

  assert.equal(snapshot.exportModel?.id, "phishing-awareness");
  assert.deepEqual(
    snapshot.dependencyGraph?.moduleDependencies.map((dependency) => dependency.moduleId),
    ["password_hygiene_reminder", "phishing_intro"]
  );
  assert.equal(snapshot.errors.length, 0);
});

test("shared module resolution warns when latest version is used without a pin", () => {
  const moduleLibrary = createTestModuleLibrary();
  const source = `
id: module-warning-course
title: Module warning course
description: Test course
start: intro
passingScore: 0
nodes:
  - include:
      module: intro_a
  - id: passed
    type: result
    title: Complete
    outcome: passed
`;

  const snapshot = runCoursePipeline(source, {
    moduleLibrary,
  });

  assert.equal(snapshot.errors.length, 0);
  assert.match(snapshot.warnings[0] ?? "", /latest available version/);
});

test("shared module resolution rejects circular module dependencies", () => {
  const moduleLibrary = createTestModuleLibrary();
  const source = `
id: circular-module-course
title: Circular module course
description: Test course
start: intro
passingScore: 0
nodes:
  - include:
      module: module_a
      version: 1.0.0
  - id: passed
    type: result
    title: Complete
    outcome: passed
`;

  const snapshot = runCoursePipeline(source, {
    moduleLibrary,
  });

  assert.equal(snapshot.failedStageId, "resolve-templates");
  assert.match(snapshot.errors[0] ?? "", /circular module include/i);
});
