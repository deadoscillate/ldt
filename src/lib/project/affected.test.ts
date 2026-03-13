import assert from "node:assert/strict";
import test from "node:test";

import {
  detectAffectedBuildTargets,
  runAffectedRebuild,
  buildModuleUsageIndex,
} from "@/lib/project/affected";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { loadModuleLibrary } from "@/lib/module-library/load";

test("affected target detection maps a shared module to dependent project builds", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);

  assert.ok(moduleLibrary);

  const targets = detectAffectedBuildTargets(projects, {
    moduleIds: ["phishing_intro"],
    moduleLibrary,
  });

  assert.equal(targets.length, 6);
  assert.ok(
    targets.every((target) => target.projectId === "security-awareness")
  );
});

test("affected target detection accepts changed module source paths", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);

  assert.ok(moduleLibrary);

  const targets = detectAffectedBuildTargets(projects, {
    changedInputs: ["module-library/modules/harassment_intro.yaml"],
    moduleLibrary,
  });

  assert.equal(targets.length, 6);
  assert.ok(
    targets.every((target) => target.projectId === "workplace-conduct")
  );
});

test("affected rebuild orchestration generates only impacted project outputs", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);

  assert.ok(moduleLibrary);

  const run = await runAffectedRebuild(projects, {
    moduleIds: ["escalation_policy"],
    moduleLibrary,
    generatedAt: "2026-03-12T21:00:00.000Z",
  });

  assert.equal(run.report.totalAffectedTargets, 1);
  assert.equal(run.report.successfulBuilds, 1);
  assert.equal(run.report.failedBuilds, 0);
  assert.equal(run.manifest.affectedTargets.length, 1);
  assert.ok(
    run.artifacts.some((artifact) =>
      artifact.path.endsWith("customer-service-escalation__retail-support__default__scorm12.zip")
    )
  );
});

test("module usage index summarizes which builds depend on each shared module", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);

  assert.ok(moduleLibrary);

  const usageIndex = buildModuleUsageIndex(projects, moduleLibrary);

  assert.equal(usageIndex.phishing_intro?.length, 6);
  assert.equal(usageIndex.harassment_intro?.length, 6);
  assert.equal(usageIndex.escalation_policy?.length, 1);
});
