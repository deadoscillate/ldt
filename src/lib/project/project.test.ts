import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import {
  exportCourseProjectBuild,
  exportCourseProjectBuildMatrix,
} from "@/lib/project/build";
import { loadModuleLibrary } from "@/lib/module-library/load";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import {
  exportCourseProjectSourceArchive,
  importCourseProjectSourceArchive,
} from "@/lib/project/source-package";

test("course projects load from disk with valid project metadata and checks", async () => {
  const projects = await loadCourseProjects();

  assert.equal(projects.length, 4);
  assert.deepEqual(
    projects.map((project) => project.id).sort(),
    [
      "customer-service",
      "sapio-forge-discovery",
      "security-awareness",
      "workplace-conduct",
    ]
  );
  assert.ok(projects.every((project) => project.validation.ready));
  assert.ok(
    projects.every((project) =>
      project.sourceFiles.some((file) => file.path === "project.yaml")
    )
  );
  assert.ok(
    projects.every((project) => project.logicTestSuites.length > 0)
  );
});

test("course project source archives round-trip through import and preserve source files", async () => {
  const projects = await loadCourseProjects();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const archive = await exportCourseProjectSourceArchive(project);
  const importedProject = await importCourseProjectSourceArchive(archive.blob);
  const zip = await JSZip.loadAsync(await archive.blob.arrayBuffer());

  assert.equal(archive.fileName, "security-awareness-source.zip");
  assert.ok(zip.file("project-source-manifest.json"));
  assert.equal(importedProject.id, project.id);
  assert.equal(importedProject.title, project.title);
  assert.equal(importedProject.templates.length, project.templates.length);
  assert.equal(importedProject.themes.length, project.themes.length);
  assert.deepEqual(
    importedProject.sourceFiles.map((file) => file.path),
    project.sourceFiles.map((file) => file.path)
  );
});

test("project SCORM exports include deterministic file names and build manifests", async () => {
  const projects = await loadCourseProjects();
  const moduleLibrary = await loadModuleLibrary();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const exported = await exportCourseProjectBuild(
    project,
    {
      templateId: "phishing-awareness",
      variantId: "k12-district",
      themeId: "default",
    },
    {
      mode: "standard",
      builtAt: "2026-03-12T18:00:00.000Z",
      moduleLibrary,
    }
  );

  assert.equal(
    exported.fileName,
    "phishing-awareness__k12-district__default__scorm12.zip"
  );
  assert.equal(exported.metadata.projectId, "security-awareness");
  assert.equal(exported.metadata.templateId, "phishing-awareness");
  assert.equal(exported.metadata.variantId, "k12-district");
  assert.equal(exported.metadata.themeId, "default");
  assert.ok(exported.buildManifest.moduleDependencies.length > 0);
  assert.ok(
    exported.artifacts.some((artifact) => artifact.path === "build-manifest.json")
  );
  assert.equal(exported.buildManifest.projectVersion, project.version);
  assert.equal(exported.buildManifest.validationReady, true);
});

test("project batch builds generate all variant and theme combinations", async () => {
  const projects = await loadCourseProjects();
  const moduleLibrary = await loadModuleLibrary();
  const project = projects.find((candidate) => candidate.id === "security-awareness");

  assert.ok(project);

  const bundle = await exportCourseProjectBuildMatrix(project, {
    mode: "validation",
    moduleLibrary,
  });

  assert.equal(bundle.summary.length, 6);
  assert.ok(
    bundle.summary.every((item) =>
      item.outputFileName.endsWith("__scorm12__validation.zip")
    )
  );
});
