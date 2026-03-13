import type { ScormExportMode } from "@/lib/export/scorm-export";

export type StudioStartingPath = "beginner" | "intermediate" | "advanced";

export type StudioAuthoringSurface =
  | "builder"
  | "source"
  | "project"
  | "variables"
  | "theme"
  | "preview"
  | "export";

export interface StudioOnboardingState {
  started: boolean;
  completed: boolean;
  dismissed: boolean;
  startHereDismissed: boolean;
  selectedPath: StudioStartingPath | null;
  firstPreviewOpened: boolean;
  firstExportCompleted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StudioPathDefinition {
  id: StudioStartingPath;
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  recommendedProjectId: string;
  recommendedTemplateId: string;
  recommendedVariantId: string;
  recommendedThemeId: string;
  authoringMode: "builder" | "source";
  emphasis: string;
}

export interface StarterExampleDefinition {
  id: string;
  audience: "beginner" | "advanced";
  title: string;
  description: string;
  projectId: string;
  templateId: string;
  variantId: string;
  themeId: string;
  authoringMode: "builder" | "source";
}

export const STUDIO_ONBOARDING_STORAGE_KEY = "ldt:studio:onboarding-state";

export const DEFAULT_STUDIO_ONBOARDING_STATE: StudioOnboardingState = {
  started: false,
  completed: false,
  dismissed: false,
  startHereDismissed: false,
  selectedPath: null,
  firstPreviewOpened: false,
  firstExportCompleted: false,
};

export const STUDIO_STARTING_PATHS: readonly StudioPathDefinition[] = [
  {
    id: "beginner",
    label: "Recommended",
    title: "Start in Guided Editor",
    description:
      "Pick a starter scenario, make changes in guided forms, preview the learner experience, and export your first SCORM package.",
    actionLabel: "Start guided editing",
    recommendedProjectId: "customer-service",
    recommendedTemplateId: "customer-service-escalation",
    recommendedVariantId: "retail-support",
    recommendedThemeId: "default",
    authoringMode: "builder",
    emphasis: "Best for most instructional designers. Guided editing is the fastest first build, and YAML stays optional.",
  },
  {
    id: "intermediate",
    label: "Repeatable",
    title: "Start from a course template",
    description:
      "Choose a ready-made training flow, pick the version that fits your audience, and adapt it without starting from scratch.",
    actionLabel: "Open template workflow",
    recommendedProjectId: "security-awareness",
    recommendedTemplateId: "phishing-awareness",
    recommendedVariantId: "k12-district",
    recommendedThemeId: "default",
    authoringMode: "builder",
    emphasis: "Best when you reuse the same lesson across teams, clients, or departments.",
  },
  {
    id: "advanced",
    label: "Technical",
    title: "Open Source Editor and project files",
    description:
      "Work directly in project files and YAML when you want deeper control, validation, and technical review.",
    actionLabel: "Open source workflow",
    recommendedProjectId: "security-awareness",
    recommendedTemplateId: "phishing-awareness",
    recommendedVariantId: "enterprise",
    recommendedThemeId: "corporate-blue",
    authoringMode: "source",
    emphasis: "Best for technical instructional designers, developers, and deeper control.",
  },
] as const;

export const STARTER_EXAMPLES: readonly StarterExampleDefinition[] = [
  {
    id: "beginner-linear",
    audience: "beginner",
    title: "Simple linear module",
    description:
      "Use the customer-service project to update a few fields in Guided Editor and export quickly.",
    projectId: "customer-service",
    templateId: "customer-service-escalation",
    variantId: "retail-support",
    themeId: "default",
    authoringMode: "builder",
  },
  {
    id: "beginner-branching",
    audience: "beginner",
    title: "Simple branching module",
    description:
      "Use the phishing-awareness project to preview a lightweight branching scenario and score flow.",
    projectId: "security-awareness",
    templateId: "phishing-awareness",
    variantId: "k12-district",
    themeId: "default",
    authoringMode: "builder",
  },
  {
    id: "sapio-forge-discovery-demo",
    audience: "beginner",
    title: "Sapio Forge discovery walkthrough",
    description:
      "Open the flagship Sapio Forge demo to show the product while collecting structured feedback about maintenance pain points.",
    projectId: "sapio-forge-discovery",
    templateId: "workflow-discovery",
    variantId: "instructional-design-team",
    themeId: "default",
    authoringMode: "builder",
  },
  {
    id: "advanced-family",
    audience: "advanced",
    title: "Course family project",
    description:
      "Inspect a multi-variant project in Source Editor and validate the shared template, variable sets, and shared module composition.",
    projectId: "security-awareness",
    templateId: "phishing-awareness",
    variantId: "healthcare",
    themeId: "corporate-blue",
    authoringMode: "source",
  },
  {
    id: "advanced-theme-ci",
    audience: "advanced",
    title: "Theme and CI build example",
    description:
      "Open a multi-theme project and follow the source-first path toward reproducible batch builds and affected rebuilds from shared-module changes.",
    projectId: "workplace-conduct",
    templateId: "conduct-reporting",
    variantId: "corporate",
    themeId: "dark",
    authoringMode: "source",
  },
] as const;

export interface FirstModuleChecklistItem {
  id: "template" | "editing" | "preview" | "export";
  label: string;
  complete: boolean;
}

export function readStudioOnboardingState(
  storage: StorageLike | null | undefined
): StudioOnboardingState {
  if (!storage) {
    return DEFAULT_STUDIO_ONBOARDING_STATE;
  }

  const rawValue = storage.getItem(STUDIO_ONBOARDING_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_STUDIO_ONBOARDING_STATE;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StudioOnboardingState>;

    return {
      ...DEFAULT_STUDIO_ONBOARDING_STATE,
      ...parsed,
      selectedPath:
        parsed.selectedPath === "beginner" ||
        parsed.selectedPath === "intermediate" ||
        parsed.selectedPath === "advanced"
          ? parsed.selectedPath
          : null,
    };
  } catch {
    storage.removeItem(STUDIO_ONBOARDING_STORAGE_KEY);
    return DEFAULT_STUDIO_ONBOARDING_STATE;
  }
}

export function writeStudioOnboardingState(
  storage: StorageLike | null | undefined,
  state: StudioOnboardingState
): StudioOnboardingState {
  if (!storage) {
    return state;
  }

  storage.setItem(STUDIO_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function markStudioOnboardingStarted(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState
): StudioOnboardingState {
  return writeStudioOnboardingState(storage, {
    ...currentState,
    started: true,
  });
}

export function dismissStudioOnboarding(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState
): StudioOnboardingState {
  return writeStudioOnboardingState(storage, {
    ...currentState,
    started: true,
    dismissed: true,
  });
}

export function dismissStudioStartHerePanel(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState
): StudioOnboardingState {
  return writeStudioOnboardingState(storage, {
    ...currentState,
    startHereDismissed: true,
  });
}

export function completeStudioOnboardingPath(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState,
  selectedPath: StudioStartingPath
): StudioOnboardingState {
  return writeStudioOnboardingState(storage, {
    ...currentState,
    started: true,
    completed: true,
    dismissed: true,
    selectedPath,
  });
}

export function recordStudioFirstPreviewOpened(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState
): StudioOnboardingState {
  if (currentState.firstPreviewOpened) {
    return currentState;
  }

  return writeStudioOnboardingState(storage, {
    ...currentState,
    firstPreviewOpened: true,
  });
}

export function recordStudioFirstExportCompleted(
  storage: StorageLike | null | undefined,
  currentState: StudioOnboardingState
): StudioOnboardingState {
  if (currentState.firstExportCompleted) {
    return currentState;
  }

  return writeStudioOnboardingState(storage, {
    ...currentState,
    firstExportCompleted: true,
  });
}

export function resetStudioOnboardingState(
  storage: StorageLike | null | undefined
): StudioOnboardingState {
  if (storage) {
    storage.removeItem(STUDIO_ONBOARDING_STORAGE_KEY);
  }

  return DEFAULT_STUDIO_ONBOARDING_STATE;
}

export function getStudioStartingPath(
  pathId: StudioStartingPath
): StudioPathDefinition {
  return (
    STUDIO_STARTING_PATHS.find((path) => path.id === pathId) ??
    STUDIO_STARTING_PATHS[0]
  );
}

export function buildFirstModuleChecklist(input: {
  hasStarterSelection: boolean;
  authoringMode: "builder" | "source";
  previewReady: boolean;
  firstExportCompleted: boolean;
}): FirstModuleChecklistItem[] {
  return [
    {
      id: "template",
      label: "Pick a starter template.",
      complete: input.hasStarterSelection,
    },
    {
      id: "editing",
      label:
        input.authoringMode === "builder"
          ? "Rename the lesson and company values."
          : "Open Source Editor if you want direct YAML control.",
      complete: input.hasStarterSelection,
    },
    {
      id: "preview",
      label: "Edit one decision point in Guided Editor.",
      complete: input.previewReady,
    },
    {
      id: "export",
      label: "Preview and export your first SCORM package.",
      complete: input.firstExportCompleted,
    },
  ];
}

export function buildEditingSurfaceSummary(input: {
  surface: StudioAuthoringSurface;
  authoringMode: "builder" | "source";
}): { label: string; description: string } {
  switch (input.surface) {
    case "builder":
      return {
        label: "You are editing in Guided Editor",
        description:
          "Use simple fields to update the course. Sapio Forge writes the structured source for you.",
      };
    case "source":
      return {
        label: "You are editing in Source Editor",
        description:
          "This YAML is the main editable source for preview and export.",
      };
    case "project":
      return {
        label: "You are choosing a starter scenario",
        description:
          "Pick the lesson you want to build, then choose the version and theme that fit your audience.",
      };
    case "variables":
      return {
        label: "You are editing course details",
        description:
          "These details personalize the lesson without changing the main training flow.",
      };
    case "theme":
      return {
        label: "You are choosing the visual theme",
        description:
          "Themes change branding and styling only. The course flow stays the same.",
      };
    case "preview":
      return {
        label: "You are viewing the learner preview",
        description:
          "This is the learner experience you are about to export as SCORM.",
      };
    case "export":
      return {
        label: "You are exporting the lesson",
        description:
          "The SCORM package is the file you deliver to SCORM Cloud or your LMS after the lesson looks right.",
      };
    default:
      return input.authoringMode === "builder"
        ? buildEditingSurfaceSummary({
            surface: "builder",
            authoringMode: input.authoringMode,
          })
        : buildEditingSurfaceSummary({
            surface: "source",
            authoringMode: input.authoringMode,
          });
  }
}

export function buildFirstExportFeedback(input: {
  firstExportCompleted: boolean;
  exportMode: ScormExportMode;
}): { title: string; message: string } {
  if (!input.firstExportCompleted) {
    return {
      title: "Your first SCORM package is ready.",
      message:
        input.exportMode === "validation"
          ? "Download the package, review the files inside, and test it in SCORM Cloud or your LMS with diagnostics turned on."
          : "Download the package, review the files inside, and test it in SCORM Cloud or your LMS.",
    };
  }

  return {
    title:
      input.exportMode === "validation"
        ? "Validation build generated successfully."
        : "SCORM 1.2 package generated successfully.",
    message:
      input.exportMode === "validation"
        ? "Download the diagnostics build or review the validation notes and package files."
        : "Download the package or review the generated files.",
  };
}

