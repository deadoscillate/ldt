import assert from "node:assert/strict";
import test from "node:test";

import { parseAndCompileCourse } from "@/lib/course/parse";
import { buildScormExportPlan } from "@/lib/export/scorm-export";
import {
  applyThemePackToCourse,
  buildThemeStyleVariables,
  buildThemeStylesheet,
} from "@/lib/theme/apply";
import { loadThemePacks } from "@/lib/theme/load-theme-packs";
import {
  parseThemePackYaml,
  parseThemeTokensYaml,
} from "@/lib/theme/schema";

const baseCourse = parseAndCompileCourse(`
id: themed-course
title: Themed Course
start: intro
passingScore: 0
nodes:
  - id: intro
    type: content
    title: Welcome
    body: Start here.
    next: passed
  - id: passed
    type: result
    title: Passed
    outcome: passed
    body: Complete.
`);

test("theme packs load metadata, tokens, and assets from the theme directory", async () => {
  const themePacks = await loadThemePacks();

  assert.ok(themePacks.length >= 3);

  const defaultThemePack = themePacks.find((themePack) => themePack.id === "default");
  assert.ok(defaultThemePack);
  assert.equal(defaultThemePack.tokens.colors.primary, "#a4481d");
  assert.ok(defaultThemePack.logoPreviewUrl?.startsWith("data:image/svg+xml;base64,"));
  assert.ok(defaultThemePack.bundleFiles.some((asset) => asset.bundlePath.endsWith("logo.svg")));
});

test("theme metadata and token schemas reject incompatible or incomplete packs", () => {
  assert.throws(
    () =>
      parseThemePackYaml(`
id: bad-theme
name: Bad Theme
description: Invalid runtime version
author: Example
version: 1.0.0
runtimeCompatibility: 2.x
supportedLayouts:
  - text
assets:
  logo: assets/logo.svg
fonts: []
`),
    /runtimeCompatibility/
  );

  assert.throws(
    () =>
      parseThemeTokensYaml(`
colors:
  primary: "#1f6feb"
typography:
  bodyFont: Inter
  headingFont: Inter
  baseSize: 16px
  headingScale: 1.1
spacing:
  panelPadding: 1rem
  sectionGap: 1rem
  cardGap: 1rem
components:
  buttonRadius: 1rem
  cardRadius: 1rem
  borderStyle: solid
`),
    /secondary/
  );
});

test("theme packs apply consistent preview tokens and asset paths", async () => {
  const themePacks = await loadThemePacks();
  const corporateTheme = themePacks.find(
    (themePack) => themePack.id === "corporate-blue"
  );

  assert.ok(corporateTheme);

  const previewCourse = applyThemePackToCourse(baseCourse, corporateTheme, {
    assetMode: "preview",
  });
  const exportCourse = applyThemePackToCourse(baseCourse, corporateTheme, {
    assetMode: "bundle",
  });
  const previewStyle = buildThemeStyleVariables(previewCourse.theme);
  const stylesheet = buildThemeStylesheet(exportCourse.theme);

  assert.equal(previewCourse.theme.name, "Corporate Blue");
  assert.equal(previewCourse.theme.primary, "#1f5fbf");
  assert.ok(previewCourse.theme.logo?.startsWith("data:image/svg+xml;base64,"));
  assert.ok(exportCourse.theme.logo?.startsWith("assets/themes/corporate-blue/"));
  assert.equal(previewStyle["--course-primary"], "#1f5fbf");
  assert.equal(previewStyle["--course-heading-font"], '"Segoe UI Semibold", "Segoe UI", sans-serif');
  assert.match(stylesheet, /--course-primary: #1f5fbf;/);
  assert.match(stylesheet, /--course-card-radius: 1.2rem;/);
});

test("branded SCORM export plans include theme metadata, stylesheet, and assets", async () => {
  const themePacks = await loadThemePacks();
  const darkTheme = themePacks.find((themePack) => themePack.id === "dark");

  assert.ok(darkTheme);

  const plan = buildScormExportPlan(baseCourse, {
    mode: "validation",
    builtAt: "2026-03-12T12:00:00.000Z",
    themePack: darkTheme,
  });

  assert.equal(plan.metadata.themeId, "dark");
  assert.equal(plan.metadata.themeName, "Dark Theme");
  assert.equal(plan.metadata.themeVersion, "1.0.0");
  assert.ok(plan.metadata.packageContents.includes("assets/theme.css"));
  assert.ok(
    plan.metadata.packageContents.some((path) =>
      path.startsWith("assets/themes/dark/")
    )
  );
  assert.ok(
    plan.artifacts.some((artifact) => artifact.path === "assets/theme.css")
  );
  assert.ok(
    plan.artifacts.some(
      (artifact) =>
        artifact.path.endsWith("logo.svg") && artifact.base64 === true
    )
  );
  assert.ok(plan.metadata.preflight.checks.some((check) => check.id === "theme-css"));
  assert.ok(plan.metadata.preflight.checks.some((check) => check.id === "theme-assets"));
});
