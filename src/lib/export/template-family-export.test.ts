import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { loadTemplatePacks } from "@/lib/course/load-template-packs";
import { runCoursePipeline } from "@/lib/course/pipeline";
import {
  buildCourseFamilyVariantFileName,
  exportCourseFamilyBuildBundle,
} from "@/lib/export/template-family-export";
import { loadThemePacks } from "@/lib/theme/load-theme-packs";

test("batch builds generate consistent output names for template variants", () => {
  assert.equal(
    buildCourseFamilyVariantFileName({
      templateId: "phishing-awareness",
      variantId: "healthcare-org",
      themeId: "default",
      mode: "standard",
    }),
    "phishing-awareness__healthcare-org__default__scorm12.zip"
  );
  assert.equal(
    buildCourseFamilyVariantFileName({
      templateId: "phishing-awareness",
      variantId: "healthcare-org",
      themeId: "default",
      mode: "validation",
    }),
    "phishing-awareness__healthcare-org__default__scorm12__validation.zip"
  );
});

test("batch export bundles multiple variant builds and records a reproducible summary", async () => {
  const [packs, themes] = await Promise.all([loadTemplatePacks(), loadThemePacks()]);
  const pack = packs.find((candidate) => candidate.id === "security-awareness");
  const themePack = themes.find((candidate) => candidate.id === "default");

  assert.ok(pack);
  assert.ok(themePack);

  const template = pack.templates.find(
    (candidate) => candidate.id === "phishing-awareness"
  );

  assert.ok(template);

  const variants = template.variants.slice(0, 2);
  const builds = variants.map((variant) => {
    const snapshot = runCoursePipeline(template.yaml, {
      templateDataOverrides: variant.values,
      variableSchema: template.variableSchema,
    });

    assert.ok(snapshot.exportModel, `${variant.id} should compile for export`);

    return {
      packId: pack.id,
      packTitle: pack.title,
      templateId: template.id,
      templateTitle: template.title,
      variantId: variant.id,
      variantTitle: variant.title,
      course: snapshot.exportModel!,
    };
  });
  const bundle = await exportCourseFamilyBuildBundle(builds, {
    mode: "validation",
    themePack,
  });

  assert.equal(bundle.summary.length, 2);
  assert.match(bundle.fileName, /security-awareness-course-family-builds\.zip$/);
  assert.ok(
    bundle.summary.every(
      (item) =>
        item.exportMode === "validation" &&
        item.outputFileName.endsWith("__default__scorm12__validation.zip")
    )
  );

  const zip = await JSZip.loadAsync(await bundle.blob.arrayBuffer());

  assert.ok(zip.file("build-summary.json"));
  bundle.summary.forEach((item) => {
    assert.ok(zip.file(item.outputFileName), item.outputFileName);
  });
});
