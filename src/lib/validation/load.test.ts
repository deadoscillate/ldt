import assert from "node:assert/strict";
import test from "node:test";

import { loadLmsValidationCatalog } from "@/lib/validation/load";

test("loads the LMS validation catalog for Moodle, Canvas, and TalentLMS", async () => {
  const catalog = await loadLmsValidationCatalog();

  assert.equal(catalog.scormCloudStatus, "passed");
  assert.ok(catalog.summary.includes("SCORM Cloud"));
  assert.ok(catalog.checklist.includes("Import package successfully"));
  assert.deepEqual(
    catalog.targets.map((target) => target.id),
    ["moodle", "canvas", "talentlms"]
  );
});
