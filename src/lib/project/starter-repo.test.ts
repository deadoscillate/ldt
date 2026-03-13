import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { load as loadYaml } from "js-yaml";

import { loadTemplatePacks } from "@/lib/course/load-template-packs";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { loadThemePacks } from "@/lib/theme/load-theme-packs";

const REPO_ROOT = process.cwd();

interface StarterRepoManifest {
  id: string;
  title: string;
  courseProjects: Array<{ id: string; path: string }>;
  templatePacks: Array<{ id: string; path: string }>;
  themes: Array<{ id: string; path: string }>;
  workflows: string[];
  docs: string[];
  quickStart: string[];
}

async function assertPathExists(relativePath: string): Promise<void> {
  await access(path.join(REPO_ROOT, relativePath));
}

test("starter repository manifest matches shipped projects, packs, and themes", async () => {
  const [manifestYaml, projects, templatePacks, themePacks] = await Promise.all([
    readFile(path.join(REPO_ROOT, "starter-repo.yaml"), "utf8"),
    loadCourseProjects(),
    loadTemplatePacks(),
    loadThemePacks(),
  ]);
  const manifest = loadYaml(manifestYaml) as StarterRepoManifest;

  assert.equal(manifest.id, "sapio-forge-starter");
  assert.deepEqual(
    manifest.courseProjects.map((entry) => entry.id).sort(),
    projects.map((project) => project.id).sort()
  );
  assert.deepEqual(
    manifest.templatePacks.map((entry) => entry.id).sort(),
    templatePacks.map((pack) => pack.id).sort()
  );
  assert.deepEqual(
    manifest.themes.map((entry) => entry.id).sort(),
    themePacks.map((theme) => theme.id).sort()
  );

  await Promise.all(
    [
      ...manifest.courseProjects.map((entry) => entry.path),
      ...manifest.templatePacks.map((entry) => entry.path),
      ...manifest.themes.map((entry) => entry.path),
      ...manifest.workflows,
      ...manifest.docs,
    ].map((relativePath) => assertPathExists(relativePath))
  );
});

test("starter repository includes expected onboarding and structure files", async () => {
  const requiredPaths = [
    "README.md",
    "CONTRIBUTING.md",
    "LICENSE",
    ".gitignore",
    "module-library/README.md",
    "course-projects/README.md",
    "template-packs/README.md",
    "themes/README.md",
    "themes/default/README.md",
    "themes/corporate-blue/README.md",
    "themes/dark/README.md",
    "assets/README.md",
    "build/README.md",
    "docs/README.md",
    "docs/getting-started.md",
    "docs/first-module.md",
    "docs/build-artifacts.md",
    "docs/shared-modules.md",
    "docs/testing-course-logic.md",
    "docs/why-testable-learning-logic-matters.md",
    "docs/repository-philosophy.md",
    "docs/rebrand-checklist.md",
  ];

  await Promise.all(requiredPaths.map((relativePath) => assertPathExists(relativePath)));
});

test("starter repository docs and workflows reference real commands and paths", async () => {
  const [readme, gettingStarted, githubActions] = await Promise.all([
    readFile(path.join(REPO_ROOT, "README.md"), "utf8"),
    readFile(path.join(REPO_ROOT, "docs/getting-started.md"), "utf8"),
    readFile(path.join(REPO_ROOT, "docs/github-actions.md"), "utf8"),
  ]);

  assert.match(readme, /Quick Start/);
  assert.match(readme, /How to Customize/);
  assert.match(readme, /GitHub Actions/);
  assert.match(readme, /test:course/);
  assert.match(readme, /module-library/);
  assert.match(readme, /course-projects\/security-awareness\/build/);

  assert.match(gettingStarted, /npm run validate:project/);
  assert.match(gettingStarted, /npm run test:course/);
  assert.match(gettingStarted, /npm run build:project/);
  assert.match(gettingStarted, /npm run build:all/);
  assert.match(gettingStarted, /course-projects\/workplace-conduct/);

  assert.match(githubActions, /validate-course-project\.yml/);
  assert.match(githubActions, /build-course-project\.yml/);
  assert.match(githubActions, /build-course-family\.yml/);
  assert.match(githubActions, /course-projects\/security-awareness/);
});
