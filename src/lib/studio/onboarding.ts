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
    label: "Beginner",
    title: "Build your first course",
    description:
      "Start from structured source through Builder view, change a few fields, compile the preview, and export your first SCORM package.",
    actionLabel: "Open Builder path",
    recommendedProjectId: "customer-service",
    recommendedTemplateId: "customer-service-escalation",
    recommendedVariantId: "retail-support",
    recommendedThemeId: "default",
    authoringMode: "builder",
    emphasis: "Best for first-time users who want a fast first export.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    title: "Start from a template pack",
    description:
      "Use reusable templates, shared modules, variable sets, and themes to generate a specific course variant without rewriting shared source.",
    actionLabel: "Open template path",
    recommendedProjectId: "security-awareness",
    recommendedTemplateId: "phishing-awareness",
    recommendedVariantId: "k12-district",
    recommendedThemeId: "default",
    authoringMode: "builder",
    emphasis: "Best when you want repeatable scenario generation from shared source.",
  },
  {
    id: "advanced",
    label: "Advanced",
    title: "Open source and project mode",
    description:
      "Inspect the source project, work directly in YAML, validate the canonical model, trace shared module dependencies, and build reproducible SCORM output from structured source.",
    actionLabel: "Open source path",
    recommendedProjectId: "security-awareness",
    recommendedTemplateId: "phishing-awareness",
    recommendedVariantId: "enterprise",
    recommendedThemeId: "corporate-blue",
    authoringMode: "source",
    emphasis: "Best for Git-based workflows and structured source control.",
  },
] as const;

export const STARTER_EXAMPLES: readonly StarterExampleDefinition[] = [
  {
    id: "beginner-linear",
    audience: "beginner",
    title: "Simple linear module",
    description:
      "Use the customer-service project to update a few fields in Builder mode and export quickly.",
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
    id: "advanced-family",
    audience: "advanced",
    title: "Course family project",
    description:
      "Inspect a multi-variant project in source mode and validate the shared template, variable sets, and shared module composition.",
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
      label: "Choose a starter template or project.",
      complete: input.hasStarterSelection,
    },
    {
      id: "editing",
      label:
        input.authoringMode === "builder"
          ? "Edit the course in Builder mode."
          : "Edit the structured source or project files.",
      complete: input.hasStarterSelection,
    },
    {
      id: "preview",
      label: "Preview the compiled course.",
      complete: input.previewReady,
    },
    {
      id: "export",
      label: "Export your first SCORM package.",
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
        label: "You are editing builder fields",
        description:
          "Use guided forms to update structured source, then compile the current course into preview and export output.",
      };
    case "source":
      return {
        label: "You are editing structured source",
        description:
          "This YAML definition is the source of truth for compile, preview, and export.",
      };
    case "project":
      return {
        label: "You are editing project selection",
        description:
          "Choose which source project, template, variant, and theme define the current course source and build target.",
      };
    case "variables":
      return {
        label: "You are editing template variables",
        description:
          "These values customize a shared template at compile time without changing its branching structure.",
      };
    case "theme":
      return {
        label: "You are editing theme selection",
        description:
          "Theme packs change branding and presentation only. Course structure stays in source.",
      };
    case "preview":
      return {
        label: "You are viewing the compiled preview",
        description:
          "This is the learner-facing runtime generated from validated source, not the editable project.",
      };
    case "export":
      return {
        label: "You are building export output",
        description:
          "The SCORM package is generated from validated source and should be treated as a build artifact.",
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
          ? "You can now download the package, inspect its contents, and test it in SCORM Cloud or your LMS with diagnostics enabled."
          : "You can now download the package, inspect its contents, and test it in SCORM Cloud or your LMS.",
    };
  }

  return {
    title:
      input.exportMode === "validation"
        ? "Validation build generated successfully."
        : "SCORM 1.2 package generated successfully.",
    message:
      input.exportMode === "validation"
        ? "Download the diagnostics-enabled package or inspect the validation notes and file structure."
        : "Download the package or inspect the generated file structure.",
  };
}
