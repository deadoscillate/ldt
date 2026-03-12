import assert from "node:assert/strict";
import test from "node:test";

import { loadCourseProjects } from "@/lib/project/load-course-projects";
import {
  buildFirstExportFeedback,
  buildFirstModuleChecklist,
  completeStudioOnboardingPath,
  dismissStudioOnboarding,
  dismissStudioStartHerePanel,
  getStudioStartingPath,
  markStudioOnboardingStarted,
  readStudioOnboardingState,
  recordStudioFirstExportCompleted,
  recordStudioFirstPreviewOpened,
  resetStudioOnboardingState,
  STARTER_EXAMPLES,
  STUDIO_ONBOARDING_STORAGE_KEY,
} from "@/lib/studio/onboarding";

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
  };
}

test("onboarding state persists started, completed, preview, export, and reset transitions", () => {
  const storage = createMemoryStorage();
  let state = readStudioOnboardingState(storage);

  assert.equal(state.completed, false);
  assert.equal(storage.getItem(STUDIO_ONBOARDING_STORAGE_KEY), null);

  state = markStudioOnboardingStarted(storage, state);
  assert.equal(state.started, true);

  state = completeStudioOnboardingPath(storage, state, "beginner");
  assert.equal(state.completed, true);
  assert.equal(state.selectedPath, "beginner");

  state = dismissStudioStartHerePanel(storage, state);
  assert.equal(state.startHereDismissed, true);

  state = recordStudioFirstPreviewOpened(storage, state);
  state = recordStudioFirstExportCompleted(storage, state);
  assert.equal(state.firstPreviewOpened, true);
  assert.equal(state.firstExportCompleted, true);

  const restored = readStudioOnboardingState(storage);
  assert.equal(restored.completed, true);
  assert.equal(restored.firstExportCompleted, true);

  const resetState = resetStudioOnboardingState(storage);
  assert.equal(resetState.completed, false);
  assert.equal(storage.getItem(STUDIO_ONBOARDING_STORAGE_KEY), null);
});

test("dismissing onboarding keeps the chooser closed without marking completion", () => {
  const storage = createMemoryStorage();
  const state = dismissStudioOnboarding(storage, readStudioOnboardingState(storage));

  assert.equal(state.dismissed, true);
  assert.equal(state.completed, false);
});

test("beginner and advanced path definitions route to expected starter selections", () => {
  const beginner = getStudioStartingPath("beginner");
  const advanced = getStudioStartingPath("advanced");

  assert.equal(beginner.recommendedProjectId, "customer-service");
  assert.equal(beginner.authoringMode, "builder");
  assert.equal(advanced.recommendedProjectId, "security-awareness");
  assert.equal(advanced.authoringMode, "source");
});

test("first-module checklist and first-export messaging reflect onboarding progress", () => {
  const checklist = buildFirstModuleChecklist({
    hasStarterSelection: true,
    authoringMode: "builder",
    previewReady: true,
    firstExportCompleted: false,
  });
  const firstExport = buildFirstExportFeedback({
    firstExportCompleted: false,
    exportMode: "standard",
  });
  const followUpExport = buildFirstExportFeedback({
    firstExportCompleted: true,
    exportMode: "validation",
  });

  assert.equal(checklist.find((item) => item.id === "preview")?.complete, true);
  assert.equal(checklist.find((item) => item.id === "export")?.complete, false);
  assert.equal(firstExport.title, "Your first SCORM package is ready.");
  assert.match(followUpExport.title, /Validation build generated successfully/);
});

test("starter examples map to real shipped projects and variants", async () => {
  const projects = await loadCourseProjects();

  STARTER_EXAMPLES.forEach((example) => {
    const project = projects.find((candidate) => candidate.id === example.projectId);
    assert.ok(project, `${example.id}: missing project ${example.projectId}`);

    const template = project.templates.find(
      (candidate) => candidate.id === example.templateId
    );
    assert.ok(template, `${example.id}: missing template ${example.templateId}`);

    const variant = template?.variants.find(
      (candidate) => candidate.id === example.variantId
    );
    assert.ok(variant, `${example.id}: missing variant ${example.variantId}`);

    const theme = project.themes.find((candidate) => candidate.id === example.themeId);
    assert.ok(theme, `${example.id}: missing theme ${example.themeId}`);
  });
});
