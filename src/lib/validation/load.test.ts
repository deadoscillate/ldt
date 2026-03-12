import assert from "node:assert/strict";
import test from "node:test";

import { loadLmsValidationCatalog } from "@/lib/validation/load";
import {
  buildProofSummaryCardData,
  getPlatformValidationStatus,
  normalizeValidationStatus,
} from "@/lib/validation/proof";
import { renderToStaticMarkup } from "react-dom/server";

import { ProofSummaryCard } from "@/components/ProofSummaryCard";

test("loads the LMS validation catalog for SCORM Cloud, Moodle, Canvas, and TalentLMS", async () => {
  const catalog = await loadLmsValidationCatalog();

  assert.equal(catalog.title, "LMS Validation Proof Center");
  assert.ok(catalog.summary.includes("SCORM Cloud"));
  assert.ok(catalog.checklist.includes("Import package successfully"));
  assert.equal(catalog.platforms[0]?.records[0]?.environment ?? "", "SCORM Cloud sandbox");
  assert.deepEqual(
    catalog.platforms.map((platform) => platform.id),
    ["scorm-cloud", "moodle", "canvas", "talentlms"]
  );
});

test("normalizes validation status and builds shareable proof summary data", async () => {
  const catalog = await loadLmsValidationCatalog();
  const scormCloud = catalog.platforms.find((platform) => platform.id === "scorm-cloud");
  const moodle = catalog.platforms.find((platform) => platform.id === "moodle");

  assert.ok(scormCloud);
  assert.ok(moodle);

  assert.equal(normalizeValidationStatus(scormCloud.records[0]!), "passed");
  assert.equal(getPlatformValidationStatus(moodle), "pending");

  const card = buildProofSummaryCardData(catalog);

  assert.equal(card.scormCloudStatus, "passed");
  assert.ok(card.platformStatuses.some((platform) => platform.name === "Canvas LMS"));
  assert.ok(card.testedBehaviorLabels.includes("Resume"));
});

test("proof summary card renders current validation evidence", async () => {
  const catalog = await loadLmsValidationCatalog();
  const markup = renderToStaticMarkup(ProofSummaryCard({ catalog }));

  assert.match(markup, /Structured authoring with visible interoperability proof/);
  assert.match(markup, /SCORM Cloud/);
  assert.match(markup, /View Proof Center/);
});
