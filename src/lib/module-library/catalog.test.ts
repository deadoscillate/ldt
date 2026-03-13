import assert from "node:assert/strict";
import test from "node:test";

import { buildSharedModuleFamilies } from "@/lib/module-library/catalog";
import { loadModuleLibrary } from "@/lib/module-library/load";
import { buildModuleUsageIndex } from "@/lib/project/affected";
import { loadCourseProjects } from "@/lib/project/load-course-projects";

test("shared module catalog groups versions and usage into first-class families", async () => {
  const [projects, moduleLibrary] = await Promise.all([
    loadCourseProjects(),
    loadModuleLibrary(),
  ]);

  assert.ok(moduleLibrary);

  const usageIndex = buildModuleUsageIndex(projects, moduleLibrary);
  const families = buildSharedModuleFamilies(moduleLibrary, usageIndex);
  const phishingFamily = families.find((family) => family.id === "phishing_intro");

  assert.ok(phishingFamily);
  assert.equal(phishingFamily.latestVersion, "1.0.0");
  assert.equal(phishingFamily.usedByCount, 6);
  assert.equal(phishingFamily.acceptedVariables.length > 0, true);
  assert.equal(phishingFamily.testStatus, "module-tests");
});
