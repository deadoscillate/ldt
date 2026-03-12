import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(process.cwd());

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

test("GitHub Actions workflow templates invoke supported course-project CLI commands", async () => {
  const validateWorkflow = await readRepoFile(
    ".github/workflows/validate-course-project.yml"
  );
  const buildWorkflow = await readRepoFile(
    ".github/workflows/build-course-project.yml"
  );
  const familyWorkflow = await readRepoFile(
    ".github/workflows/build-course-family.yml"
  );

  assert.match(validateWorkflow, /scripts\/course-project-build\.ts validate/);
  assert.match(validateWorkflow, /actions\/upload-artifact@v4/);
  assert.match(validateWorkflow, /course-projects\/\*\/project\.yaml/);

  assert.match(buildWorkflow, /scripts\/course-project-build\.ts export/);
  assert.match(buildWorkflow, /--target/);
  assert.match(buildWorkflow, /build-summary\.md/);
  assert.match(buildWorkflow, /ci-build-report\.json/);

  assert.match(familyWorkflow, /scripts\/course-project-build\.ts export-all/);
  assert.match(familyWorkflow, /actions\/upload-artifact@v4/);
  assert.match(familyWorkflow, /workflow_dispatch/);
});

test("GitHub Actions docs describe repo structure and build artifacts", async () => {
  const githubActionsDoc = await readRepoFile("docs/github-actions.md");
  const ciCdDoc = await readRepoFile("docs/ci-cd-for-learning-modules.md");

  assert.match(githubActionsDoc, /course-projects\/security-awareness/);
  assert.match(githubActionsDoc, /build\/scorm12/);
  assert.match(githubActionsDoc, /validate-course-project\.yml/);
  assert.match(githubActionsDoc, /build-course-family\.yml/);

  assert.match(ciCdDoc, /source files live in Git/i);
  assert.match(ciCdDoc, /SCORM packages are reproducible artifacts/i);
  assert.match(ciCdDoc, /artifact upload/i);
});
