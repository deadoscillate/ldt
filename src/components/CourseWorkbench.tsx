"use client";

import yaml from "js-yaml";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { CourseBuilder } from "@/components/CourseBuilder";
import { GuidedWalkthrough } from "@/components/GuidedWalkthrough";
import { HelpHint } from "@/components/HelpHint";
import { LmsValidationPanel } from "@/components/LmsValidationPanel";
import { LmsValidationWorkspace } from "@/components/LmsValidationWorkspace";
import { RuntimePlayer } from "@/components/RuntimePlayer";
import { StudioFeedbackPanel } from "@/components/StudioFeedbackPanel";
import { StudioPathChooser } from "@/components/StudioPathChooser";
import { TemplateDataEditor } from "@/components/TemplateDataEditor";
import { ValidationIssueList } from "@/components/ValidationIssueList";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { YamlEditor } from "@/components/YamlEditor";
import { BRAND } from "@/lib/app/brand";
import {
  builderCourseToYaml,
  compiledCourseToBuilderCourse,
  createEmptyBuilderCourse,
  type BuilderCourse,
} from "@/lib/course/builder";
import { buildStructureInspectorData } from "@/lib/course/inspector";
import {
  runCoursePipeline,
  type CoursePipelineSnapshot,
} from "@/lib/course/pipeline";
import {
  getClientTelemetryIdentity,
  trackClientEvent,
} from "@/lib/events/client";
import {
  inspectTemplateFieldsWithOverrides,
} from "@/lib/course/parse";
import type { TemplateScalarValue } from "@/lib/course/schema";
import {
  buildTemplateFieldDefinitions,
  type TemplateVariableSchema,
} from "@/lib/course/template-variables";
import {
  buildCourseProjectReadme,
  buildSourceDownloadFileName,
  createDuplicatedVariantDraft,
  inferCourseProjectDirectory,
  parseTemplateDataYaml,
  serializeTemplateDataYaml,
} from "@/lib/course/source-files";
import type {
  TemplatePack,
  TemplatePackTemplate,
  TemplatePackVariant,
} from "@/lib/course/template-pack";
import type { TemplateFieldDefinition } from "@/lib/course/template";
import type { CompiledCourse } from "@/lib/course/types";
import {
  buildSharedModuleFamilies,
  findSharedModuleVersion,
  summarizeModuleUsageCoverage,
} from "@/lib/module-library/catalog";
import {
  compareModuleVersions,
  type SharedModuleLibrary,
} from "@/lib/module-library/schema";
import {
  extractSharedModuleFromYaml,
  insertSharedModuleIntoYaml,
} from "@/lib/module-library/workflows";
import {
  buildCourseProjectBuildContext,
  exportCourseProjectBuildMatrix,
} from "@/lib/project/build";
import type { ModuleUsageIndex } from "@/lib/project/affected";
import {
  exportCourseProjectSourceArchive,
  importCourseProjectSourceArchive,
} from "@/lib/project/source-package";
import type { CourseProject } from "@/lib/project/schema";
import {
  runCourseProjectLogicTests,
  type CourseProjectLogicTestRun,
} from "@/lib/project/testing";
import {
  buildScormExportPreview,
  exportCourseAsScormZip,
  type ScormBuildContext,
  type ScormExportMode,
  type ScormPackageMetadata,
} from "@/lib/export/scorm-export";
import {
  exportCourseFamilyBuildBundle,
  type CourseFamilyBuildSummaryItem,
} from "@/lib/export/template-family-export";
import { clearAllRuntimeStates } from "@/lib/runtime/storage";
import {
  applyThemePackToCourse,
  buildThemeTokenSummary,
} from "@/lib/theme/apply";
import type { ThemePack } from "@/lib/theme/schema";
import {
  buildEditingSurfaceSummary,
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
  STUDIO_STARTING_PATHS,
  type StudioOnboardingState,
  type StudioAuthoringSurface,
  type StudioStartingPath,
} from "@/lib/studio/onboarding";
import {
  buildBrowserInfo,
  buildStudioFeedbackContext,
} from "@/lib/studio/feedback";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface CourseWorkbenchProps {
  courseProjects: CourseProject[];
  templatePacks: TemplatePack[];
  themePacks: ThemePack[];
  validationCatalog: LmsValidationCatalog;
  moduleLibrary: SharedModuleLibrary | null;
  moduleUsageIndex: ModuleUsageIndex;
  children?: ReactNode;
}

interface FeedbackState {
  tone: "success" | "error" | "info";
  title: string;
  message: string;
}

interface TemplateDraftState {
  fields: TemplateFieldDefinition[];
  values: Record<string, TemplateScalarValue>;
}

interface ExportedPackageState {
  fileName: string;
  objectUrl: string;
  contents: readonly string[];
  metadata: ScormPackageMetadata;
  validationNotes: string;
}

interface ExportedBatchState {
  fileName: string;
  objectUrl: string;
  summary: readonly CourseFamilyBuildSummaryItem[];
}

interface BuildHistoryEntry {
  id: string;
  timestamp: string;
  label: string;
  success: boolean;
  target: string;
  themeName: string | null;
  fileName: string | null;
  objectUrl: string | null;
  manifestAvailable: boolean;
}

type AuthoringMode = "builder" | "source";
type StudioStep = "setup" | "edit" | "preview" | "export" | "advanced";

const DEMO_WALKTHROUGH_STORAGE_KEY = "ldt:studio:walkthrough-dismissed";
const STUDIO_STEP_COPY: ReadonlyArray<{
  id: StudioStep;
  step: number;
  label: string;
  description: string;
}> = [
  {
    id: "setup",
    step: 1,
    label: "Setup",
    description: "Choose the project, template, saved version, and theme.",
  },
  {
    id: "edit",
    step: 2,
    label: "Edit",
    description: "Update the course in Guided Editor or Source Editor.",
  },
  {
    id: "preview",
    step: 3,
    label: "Preview",
    description: "Run through the learner experience before export.",
  },
  {
    id: "export",
    step: 4,
    label: "Export",
    description: "Build SCORM and review LMS validation checks.",
  },
  {
    id: "advanced",
    step: 5,
    label: "Advanced",
    description: "Open tests, modules, project details, and deep source views.",
  },
] as const;

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function scrollToElement(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  if (typeof window === "undefined") {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

function getStudioStepHref(step: StudioStep): string {
  return `/studio/${step}`;
}

function getStudioStepFromPathname(pathname: string | null): StudioStep {
  if (!pathname) {
    return "setup";
  }

  const normalizedPath = pathname.replace(/\/+$/, "");

  if (normalizedPath.endsWith("/edit")) {
    return "edit";
  }

  if (normalizedPath.endsWith("/preview")) {
    return "preview";
  }

  if (normalizedPath.endsWith("/export")) {
    return "export";
  }

  if (normalizedPath.endsWith("/advanced")) {
    return "advanced";
  }

  return "setup";
}

function courseProjectToTemplatePack(project: CourseProject): TemplatePack {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    category: "course-project",
    recommendedUseCase: `Version ${project.version} | ${project.buildTargets.join(", ")}`,
    readme: project.readme,
    templates: project.templates,
  };
}

function templateFieldsToValues(
  fields: TemplateFieldDefinition[]
): Record<string, TemplateScalarValue> {
  return Object.fromEntries(fields.map((field) => [field.key, field.value]));
}

function mergeTemplateFieldValues(
  fields: TemplateFieldDefinition[],
  values: Record<string, TemplateScalarValue>,
  preserveExistingValues: boolean
): Record<string, TemplateScalarValue> {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      preserveExistingValues && field.key in values ? values[field.key] : field.value,
    ])
  );
}

function serializeTemplateData(
  values: Record<string, TemplateScalarValue>
): string {
  return JSON.stringify(
    Object.entries(values).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    )
  );
}

function inspectTemplateDraft(
  source: string,
  overrides: Record<string, TemplateScalarValue> = {},
  variableSchema: TemplateVariableSchema | null = null
): TemplateDraftState | null {
  const fields = inspectTemplateFieldsWithOverrides(
    source,
    overrides,
    variableSchema
  );

  if (fields === null) {
    return null;
  }

  return {
    fields,
    values: templateFieldsToValues(fields),
  };
}

function buildPipelineSnapshot(
  source: string,
  templateData: Record<string, TemplateScalarValue>,
  variableSchema: TemplateVariableSchema | null = null,
  moduleLibrary: SharedModuleLibrary | null = null
): CoursePipelineSnapshot {
  return runCoursePipeline(source, {
    templateDataOverrides: templateData,
    variableSchema,
    moduleLibrary,
  });
}

function downloadPackage(fileName: string, objectUrl: string): void {
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();
}

function downloadTextFile(fileName: string, contents: string): void {
  const objectUrl = window.URL.createObjectURL(
    new Blob([contents], {
      type: "text/plain;charset=utf-8",
    })
  );
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

function formatBuildTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function CourseWorkbench({
  courseProjects,
  templatePacks,
  themePacks,
  validationCatalog,
  moduleLibrary,
  moduleUsageIndex,
  children,
}: CourseWorkbenchProps) {
  const initialProjects = courseProjects;
  const initialProjectPacks =
    initialProjects.length > 0
      ? initialProjects.map(courseProjectToTemplatePack)
      : templatePacks;
  const defaultPack = initialProjectPacks[0] ?? templatePacks[0];
  const defaultProject =
    initialProjects.find((project) => project.id === defaultPack?.id) ?? null;
  const defaultTemplate = defaultProject?.templates[0] ?? defaultPack.templates[0]!;
  const defaultVariant =
    defaultTemplate.variants.find(
      (variant) => variant.id === defaultProject?.defaultVariantId
    ) ??
    defaultTemplate.variants[0]!;
  const availableDefaultThemes =
    defaultProject?.themes.length ? defaultProject.themes : themePacks;
  const defaultThemePack =
    availableDefaultThemes.find(
      (themePack) => themePack.id === defaultProject?.defaultThemeId
    ) ??
    availableDefaultThemes.find((themePack) => themePack.id === "default") ??
    availableDefaultThemes[0]!;
  const defaultTemplateData = defaultVariant.values;
  const defaultPipelineSnapshot = buildPipelineSnapshot(
    defaultTemplate.yaml,
    defaultTemplateData,
    defaultTemplate.variableSchema,
    moduleLibrary
  );
  const defaultTemplateDraft = inspectTemplateDraft(
    defaultTemplate.yaml,
    defaultTemplateData,
    defaultTemplate.variableSchema
  ) ?? {
    fields: [],
    values: defaultTemplateData,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateDataFileInputRef = useRef<HTMLInputElement>(null);
  const projectSourceFileInputRef = useRef<HTMLInputElement>(null);
  const startHerePanelRef = useRef<HTMLElement>(null);
  const templateSelectorRef = useRef<HTMLDivElement>(null);
  const yamlEditorRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const exportSectionRef = useRef<HTMLDivElement>(null);
  const validationSectionRef = useRef<HTMLElement>(null);
  const advancedSectionRef = useRef<HTMLDetailsElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const setupStepButtonRef = useRef<HTMLButtonElement>(null);
  const editStepButtonRef = useRef<HTMLButtonElement>(null);
  const previewStepButtonRef = useRef<HTMLButtonElement>(null);
  const exportStepButtonRef = useRef<HTMLButtonElement>(null);
  const advancedStepButtonRef = useRef<HTMLButtonElement>(null);
  const authoringGuideRef = useRef<HTMLDetailsElement>(null);
  const firstModuleGuideRef = useRef<HTMLDetailsElement>(null);
  const studioRootRef = useRef<HTMLElement>(null);
  const exportObjectUrlRef = useRef<string | null>(null);
  const batchExportObjectUrlRef = useRef<string | null>(null);
  const buildHistoryUrlsRef = useRef<string[]>([]);
  const builderEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [availableProjects, setAvailableProjects] = useState<CourseProject[]>(
    initialProjects
  );
  const [draftYaml, setDraftYaml] = useState(defaultTemplate.yaml);
  const [templateFields, setTemplateFields] = useState(defaultTemplateDraft.fields);
  const [templateDataValues, setTemplateDataValues] = useState(
    defaultTemplateDraft.values
  );
  const [compiledSnapshot, setCompiledSnapshot] = useState<CoursePipelineSnapshot>(() =>
    defaultPipelineSnapshot
  );
  const [draftSnapshot, setDraftSnapshot] = useState<CoursePipelineSnapshot>(() =>
    defaultPipelineSnapshot
  );
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    defaultProject?.id ?? null
  );
  const [activePackId, setActivePackId] = useState<string | null>(defaultPack.id);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    defaultTemplate.id
  );
  const [activeThemeId, setActiveThemeId] = useState<string | null>(defaultThemePack.id);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    defaultVariant.id
  );
  const [variantDraftId, setVariantDraftId] = useState(defaultVariant.id);
  const [variantDraftTitle, setVariantDraftTitle] = useState(defaultVariant.title);
  const [sourceLabel, setSourceLabel] = useState(
    defaultProject
      ? `Source project variant: ${defaultVariant.title}`
      : `Template pack variant: ${defaultVariant.title}`
  );
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>("builder");
  const [activeStudioSurface, setActiveStudioSurface] = useState<
    StudioAuthoringSurface | "studio"
  >("builder");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [onboardingState, setOnboardingState] = useState<StudioOnboardingState>(
    readStudioOnboardingState(null)
  );
  const [isPathChooserOpen, setIsPathChooserOpen] = useState(false);
  const [lastExportedPackage, setLastExportedPackage] =
    useState<ExportedPackageState | null>(null);
  const [lastBatchExport, setLastBatchExport] = useState<ExportedBatchState | null>(
    null
  );
  const [isPackageViewerOpen, setIsPackageViewerOpen] = useState(false);
  const [isAuthoringGuideOpen, setIsAuthoringGuideOpen] = useState(false);
  const [isFirstModuleGuideOpen, setIsFirstModuleGuideOpen] = useState(false);
  const [tourInstanceKey, setTourInstanceKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [buildHistory, setBuildHistory] = useState<BuildHistoryEntry[]>([]);
  const [exportMode, setExportMode] = useState<ScormExportMode>("standard");
  const [logicTestRun, setLogicTestRun] = useState<CourseProjectLogicTestRun | null>(
    null
  );
  const [isRunningLogicTests, setIsRunningLogicTests] = useState(false);
  const [requirePassingTestsBeforeExport, setRequirePassingTestsBeforeExport] =
    useState(false);
  const [selectedModuleFamilyId, setSelectedModuleFamilyId] = useState<string | null>(
    moduleLibrary?.modules[0]?.id ?? null
  );
  const [selectedModuleVersion, setSelectedModuleVersion] = useState<string | null>(
    null
  );
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState("all");
  const [moduleIncludeValues, setModuleIncludeValues] = useState<
    Record<string, TemplateScalarValue>
  >({});
  const [moduleExtractStepId, setModuleExtractStepId] = useState<string | null>(null);
  const [moduleDraftId, setModuleDraftId] = useState("");
  const [moduleDraftTitle, setModuleDraftTitle] = useState("");
  const [moduleDraftDescription, setModuleDraftDescription] = useState("");
  const [moduleDraftCategory, setModuleDraftCategory] = useState("shared");
  const [moduleDraftTags, setModuleDraftTags] = useState("");
  const [selectedValidationTargetId, setSelectedValidationTargetId] = useState(
    validationCatalog.platforms.find((platform) => platform.id !== "scorm-cloud")?.id ??
      validationCatalog.platforms[0]?.id ??
      "moodle"
  );
  const [selectedBatchVariantIds, setSelectedBatchVariantIds] = useState<string[]>([
    defaultVariant.id,
  ]);
  const [builderDraft, setBuilderDraft] = useState<BuilderCourse>(() =>
    defaultPipelineSnapshot.canonicalCourse
      ? compiledCourseToBuilderCourse(defaultPipelineSnapshot.canonicalCourse)
      : createEmptyBuilderCourse()
  );
  const pathname = usePathname();
  const router = useRouter();
  const activeStudioStep = getStudioStepFromPathname(pathname);
  const currentStudioStepCopy =
    STUDIO_STEP_COPY.find((step) => step.id === activeStudioStep) ??
    STUDIO_STEP_COPY[0];

  const availablePacks =
    availableProjects.length > 0
      ? availableProjects.map(courseProjectToTemplatePack)
      : templatePacks;
  const sharedModuleFamilies = buildSharedModuleFamilies(
    moduleLibrary,
    moduleUsageIndex
  );
  const moduleCategories = [
    "all",
    ...new Set(sharedModuleFamilies.map((family) => family.category)),
  ];
  const filteredSharedModuleFamilies = sharedModuleFamilies.filter((family) => {
    const matchesCategory =
      moduleCategoryFilter === "all" || family.category === moduleCategoryFilter;
    const normalizedSearchQuery = moduleSearchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      family.title.toLowerCase().includes(normalizedSearchQuery) ||
      family.id.toLowerCase().includes(normalizedSearchQuery) ||
      family.description.toLowerCase().includes(normalizedSearchQuery) ||
      family.tags.some((tag) => tag.toLowerCase().includes(normalizedSearchQuery));

    return matchesCategory && matchesSearch;
  });
  const selectedProject =
    availableProjects.find((project) => project.id === activeProjectId) ?? null;
  const selectedPack =
    availablePacks.find((pack) => pack.id === activePackId) ?? null;
  const availableTemplates =
    selectedProject?.templates ?? selectedPack?.templates ?? [];
  const availableThemes =
    selectedProject?.themes.length && selectedProject.themes.length > 0
      ? selectedProject.themes
      : themePacks;
  const selectedTemplate =
    availableTemplates.find((template) => template.id === activeTemplateId) ?? null;
  const selectedThemePack =
    availableThemes.find((themePack) => themePack.id === activeThemeId) ??
    defaultThemePack ??
    null;
  const selectedVariant =
    selectedTemplate?.variants.find((variant) => variant.id === activeVariantId) ?? null;
  const selectedVariableSchema = selectedTemplate?.variableSchema ?? null;
  const selectedValidationTarget =
    validationCatalog.platforms.find(
      (platform) => platform.id === selectedValidationTargetId
    ) ?? validationCatalog.platforms[0];
  const selectedSharedModuleFamily =
    sharedModuleFamilies.find((family) => family.id === selectedModuleFamilyId) ??
    filteredSharedModuleFamilies[0] ??
    null;
  const selectedSharedModule = findSharedModuleVersion(
    selectedSharedModuleFamily,
    selectedModuleVersion
  );
  const selectedModuleFields = selectedSharedModule
    ? buildTemplateFieldDefinitions(
        selectedSharedModule.templateData,
        selectedSharedModule.variableSchema
      )
    : [];
  const selectedStartingPath = onboardingState.selectedPath
    ? getStudioStartingPath(onboardingState.selectedPath)
    : null;
  const hasUncompiledChanges =
    draftYaml !== compiledSnapshot.source ||
    serializeTemplateData(templateDataValues) !== compiledSnapshot.templateDataFingerprint;
  const activeSnapshot = hasUncompiledChanges ? draftSnapshot : compiledSnapshot;
  const activeModuleDependencies =
    activeSnapshot.dependencyGraph?.moduleDependencies ?? [];
  const selectedModuleUsageTargets =
    moduleUsageIndex[selectedSharedModuleFamily?.id ?? ""] ?? [];
  const selectedProjectAffectedTargets = selectedProject
    ? selectedModuleUsageTargets.filter(
        (target) => target.projectId === selectedProject.id
      )
    : [];
  const selectedActiveModuleDependency =
    selectedSharedModuleFamily
      ? activeModuleDependencies.find(
          (dependency) => dependency.moduleId === selectedSharedModuleFamily.id
        ) ?? null
      : null;
  const extractableModuleSteps =
    activeSnapshot.canonicalCourse?.nodeOrder.map((nodeId) => ({
      id: nodeId,
      title: activeSnapshot.canonicalCourse?.nodes[nodeId]?.title ?? nodeId,
      type: activeSnapshot.canonicalCourse?.nodes[nodeId]?.sourceType ?? "content",
    })) ?? [];
  const activeProjectBuildSelection =
    selectedProject && selectedTemplate && selectedThemePack && activeVariantId
      ? {
          templateId: selectedTemplate.id,
          variantId: activeVariantId,
          themeId: selectedThemePack.id,
        }
      : null;
  const activeProjectLogicTests =
    selectedProject?.logicTestSuites.flatMap((suite) =>
      suite.tests.map((testCase) => ({
        suiteId: suite.id,
        suiteTitle: suite.title,
        suiteSourcePath: suite.sourcePath,
        testId: testCase.id,
        name: testCase.name,
        description: testCase.description,
      }))
    ) ?? [];
  const activePreviewCourse =
    activeSnapshot.previewModel && selectedThemePack
      ? applyThemePackToCourse(activeSnapshot.previewModel, selectedThemePack, {
          assetMode: "preview",
        })
      : activeSnapshot.previewModel;
  const activeBuildContext: ScormBuildContext | null =
    selectedProject && selectedTemplate && selectedThemePack
      ? buildCourseProjectBuildContext({
          project: selectedProject,
          template: selectedTemplate,
          variant:
            selectedVariant ?? {
              id: activeVariantId ?? variantDraftId,
              templateId: selectedTemplate.id,
              title: variantDraftTitle,
              description: "",
              notes: "",
              values: templateDataValues,
              valuesYaml: serializeTemplateDataYaml(templateDataValues),
            },
          theme: selectedThemePack,
          snapshot: compiledSnapshot,
        })
      : null;
  const displayedValidationErrors = activeSnapshot.errors;
  const exportPlan = compiledSnapshot.exportModel
    ? buildScormExportPreview(compiledSnapshot.exportModel, {
        mode: exportMode,
        validationCatalog,
        themePack: selectedThemePack,
        buildContext: activeBuildContext,
      })
    : null;
  const isReadyToExport =
    Boolean(compiledSnapshot.exportModel) &&
    !hasUncompiledChanges &&
    Boolean(exportPlan?.metadata.preflight.ready);
  const structureInspector = buildStructureInspectorData({
    course: activeSnapshot.canonicalCourse,
    templateFields,
    errors: displayedValidationErrors,
    isReadyToExport,
  });
  const beginnerExamples = STARTER_EXAMPLES.filter(
    (example) => example.audience === "beginner"
  );
  const advancedExamples = STARTER_EXAMPLES.filter(
    (example) => example.audience === "advanced"
  );
  const firstModuleChecklist = buildFirstModuleChecklist({
    hasStarterSelection: Boolean(selectedProject && selectedTemplate && selectedThemePack),
    authoringMode,
    previewReady: Boolean(compiledSnapshot.previewModel && !hasUncompiledChanges),
    firstExportCompleted: onboardingState.firstExportCompleted,
  });
  const authoringSurfaceSummary = buildEditingSurfaceSummary({
    surface: authoringMode === "builder" ? "builder" : "source",
    authoringMode,
  });
  const variableSurfaceSummary = buildEditingSurfaceSummary({
    surface: "variables",
    authoringMode,
  });
  const themeSurfaceSummary = buildEditingSurfaceSummary({
    surface: "theme",
    authoringMode,
  });
  const projectSurfaceSummary = buildEditingSurfaceSummary({
    surface: "project",
    authoringMode,
  });
  const previewSurfaceSummary = buildEditingSurfaceSummary({
    surface: "preview",
    authoringMode,
  });
  const exportSurfaceSummary = buildEditingSurfaceSummary({
    surface: "export",
    authoringMode,
  });
  const telemetryIdentity = getClientTelemetryIdentity();
  const studioFeedbackContext = buildStudioFeedbackContext({
    currentScreen: activeStudioSurface,
    pagePath: typeof window !== "undefined" ? window.location.pathname : "/studio",
    projectId: selectedProject?.id ?? null,
    projectTitle: selectedProject?.title ?? null,
    templateId: selectedTemplate?.id ?? null,
    templateTitle: selectedTemplate?.title ?? null,
    variantId: activeVariantId ?? variantDraftId,
    variantTitle: selectedVariant?.title ?? variantDraftTitle,
    themeId: selectedThemePack?.id ?? null,
    themeName: selectedThemePack?.name ?? null,
    clientId: telemetryIdentity?.clientId ?? null,
    sessionId: telemetryIdentity?.sessionId ?? null,
    browser:
      typeof window !== "undefined" ? buildBrowserInfo(window.navigator) : undefined,
  });

  useEffect(() => {
    return () => {
      if (builderEditTimeoutRef.current) {
        clearTimeout(builderEditTimeoutRef.current);
      }

      if (exportObjectUrlRef.current) {
        window.URL.revokeObjectURL(exportObjectUrlRef.current);
      }

      if (batchExportObjectUrlRef.current) {
        window.URL.revokeObjectURL(batchExportObjectUrlRef.current);
      }

      buildHistoryUrlsRef.current.forEach((objectUrl) => {
        window.URL.revokeObjectURL(objectUrl);
      });
    };
  }, []);

  useEffect(() => {
    setLogicTestRun(null);
  }, [activeProjectId, activeTemplateId, activeVariantId, activeThemeId]);

  useEffect(() => {
    const storage = getBrowserStorage();
    const storedState = readStudioOnboardingState(storage);

    setOnboardingState(storedState);

    if (!storedState.completed && !storedState.dismissed) {
      if (!storedState.started) {
        const startedState = markStudioOnboardingStarted(storage, storedState);
        setOnboardingState(startedState);
        trackStudioEvent("onboarding_started", {
          surface: "studio",
        });
      }

      setIsPathChooserOpen(true);
    }
  }, []);

  useEffect(() => {
    if (sharedModuleFamilies.length === 0) {
      if (selectedModuleFamilyId !== null) {
        setSelectedModuleFamilyId(null);
      }

      return;
    }

    if (
      !selectedModuleFamilyId ||
      !sharedModuleFamilies.some((family) => family.id === selectedModuleFamilyId)
    ) {
      setSelectedModuleFamilyId(sharedModuleFamilies[0]!.id);
    }
  }, [selectedModuleFamilyId, sharedModuleFamilies]);

  useEffect(() => {
    if (!selectedSharedModuleFamily) {
      if (selectedModuleVersion !== null) {
        setSelectedModuleVersion(null);
      }

      return;
    }

    if (
      !selectedModuleVersion ||
      !selectedSharedModuleFamily.versions.some(
        (module) => module.version === selectedModuleVersion
      )
    ) {
      setSelectedModuleVersion(selectedSharedModuleFamily.latestVersion);
    }
  }, [selectedModuleVersion, selectedSharedModuleFamily]);

  useEffect(() => {
    if (!selectedSharedModule) {
      setModuleIncludeValues({});
      return;
    }

    setModuleIncludeValues(
      templateFieldsToValues(
        buildTemplateFieldDefinitions(
          selectedSharedModule.templateData,
          selectedSharedModule.variableSchema
        )
      )
    );
  }, [selectedSharedModule?.id, selectedSharedModule?.version]);

  useEffect(() => {
    if (extractableModuleSteps.length === 0) {
      if (moduleExtractStepId !== null) {
        setModuleExtractStepId(null);
      }

      return;
    }

    if (
      !moduleExtractStepId ||
      !extractableModuleSteps.some((step) => step.id === moduleExtractStepId)
    ) {
      setModuleExtractStepId(extractableModuleSteps[0]!.id);
    }
  }, [extractableModuleSteps, moduleExtractStepId]);

  useEffect(() => {
    if (!moduleExtractStepId) {
      return;
    }

    if (!moduleDraftId.trim()) {
      setModuleDraftId(moduleExtractStepId);
    }

    if (!moduleDraftTitle.trim()) {
      const matchingStep = extractableModuleSteps.find(
        (step) => step.id === moduleExtractStepId
      );

      if (matchingStep) {
        setModuleDraftTitle(matchingStep.title);
      }
    }
  }, [extractableModuleSteps, moduleDraftId, moduleDraftTitle, moduleExtractStepId]);

  function clearLastExportedPackage(): void {
    if (exportObjectUrlRef.current) {
      window.URL.revokeObjectURL(exportObjectUrlRef.current);
      exportObjectUrlRef.current = null;
    }

    setLastExportedPackage(null);
    setIsPackageViewerOpen(false);
  }

  function clearLastBatchExport(): void {
    if (batchExportObjectUrlRef.current) {
      window.URL.revokeObjectURL(batchExportObjectUrlRef.current);
      batchExportObjectUrlRef.current = null;
    }

    setLastBatchExport(null);
  }

  function appendBuildHistory(entry: BuildHistoryEntry): void {
    if (entry.objectUrl) {
      buildHistoryUrlsRef.current = [...buildHistoryUrlsRef.current, entry.objectUrl];
    }

    setBuildHistory((currentEntries) => {
      const nextEntries = [entry, ...currentEntries].slice(0, 8);
      const nextUrls = new Set(
        nextEntries
          .map((historyEntry) => historyEntry.objectUrl)
          .filter((value): value is string => Boolean(value))
      );

      buildHistoryUrlsRef.current = buildHistoryUrlsRef.current.filter((objectUrl) => {
        if (nextUrls.has(objectUrl)) {
          return true;
        }

        window.URL.revokeObjectURL(objectUrl);
        return false;
      });

      return nextEntries;
    });
  }

  function syncTemplateDraft(
    source: string,
    preserveExistingValues: boolean,
    variableSchema: TemplateVariableSchema | null = selectedVariableSchema
  ): Record<string, TemplateScalarValue> {
    const nextTemplateDraft = inspectTemplateDraft(
      source,
      templateDataValues,
      variableSchema
    );

    if (!nextTemplateDraft) {
      return templateDataValues;
    }

    const nextValues = mergeTemplateFieldValues(
      nextTemplateDraft.fields,
      templateDataValues,
      preserveExistingValues
    );

    setTemplateFields(nextTemplateDraft.fields);
    setTemplateDataValues(nextValues);
    return nextValues;
  }

  function syncBuilderFromCompiledCourse(course: CompiledCourse | null): void {
    if (!course) {
      return;
    }

    setBuilderDraft(compiledCourseToBuilderCourse(course));
  }

  function setCompiledBuild(snapshot: CoursePipelineSnapshot): void {
    startTransition(() => {
      setCompiledSnapshot(snapshot);
    });
  }

  function updateDraftPipeline(
    source: string,
    nextTemplateData: Record<string, TemplateScalarValue>,
    nextFeedback?: FeedbackState | null,
    syncBuilder = false,
    variableSchema: TemplateVariableSchema | null = selectedVariableSchema
  ): CoursePipelineSnapshot {
    const nextSnapshot = buildPipelineSnapshot(
      source,
      nextTemplateData,
      variableSchema,
      moduleLibrary
    );

    startTransition(() => {
      setDraftSnapshot(nextSnapshot);
    });

    if (syncBuilder && nextSnapshot.canonicalCourse) {
      syncBuilderFromCompiledCourse(nextSnapshot.canonicalCourse);
    }

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }

    return nextSnapshot;
  }

  function applyBuilderCourse(
    nextBuilderCourse: BuilderCourse,
    nextFeedback?: FeedbackState | null,
    nextTemplateData: Record<string, TemplateScalarValue> = templateDataValues,
    variableSchema: TemplateVariableSchema | null = selectedVariableSchema
  ): void {
    const nextSource = builderCourseToYaml(nextBuilderCourse, nextTemplateData);
    const nextSnapshot = buildPipelineSnapshot(
      nextSource,
      nextTemplateData,
      variableSchema,
      moduleLibrary
    );

    setBuilderDraft(nextBuilderCourse);
    setDraftYaml(nextSource);
    clearLastExportedPackage();
    clearLastBatchExport();
    setActiveVariantId(null);
    setActiveStudioSurface("builder");
    setSourceLabel(`Guided Editor draft: ${variantDraftTitle}`);

    startTransition(() => {
      setDraftSnapshot(nextSnapshot);
    });

    scheduleBuilderEditEvent(nextBuilderCourse, nextSnapshot.errors.length);

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }
  }

  function navigateToStudioStep(step: StudioStep): void {
    const href = getStudioStepHref(step);

    if (pathname !== href) {
      router.push(href);
    }
  }

  function openAuthoringGuide(): void {
    setIsAuthoringGuideOpen(true);
    navigateToStudioStep("edit");
    window.setTimeout(() => {
      scrollToElement(authoringGuideRef.current);
    }, 120);
  }

  function openFirstModuleGuide(): void {
    setIsFirstModuleGuideOpen(true);
    navigateToStudioStep("edit");
    window.setTimeout(() => {
      scrollToElement(firstModuleGuideRef.current);
    }, 120);
  }

  function trackStudioEvent(
    eventName: string,
    metadata: Record<string, string | number | boolean | null> = {}
  ): void {
    trackClientEvent(
      eventName,
      {
        currentScreen: activeStudioSurface,
        projectId: selectedProject?.id ?? null,
        templateId: selectedTemplate?.id ?? null,
        variantId: activeVariantId ?? variantDraftId,
        themeId: selectedThemePack?.id ?? null,
        ...metadata,
      },
      "studio"
    );
  }

  function scheduleBuilderEditEvent(
    nextBuilderCourse: BuilderCourse,
    issueCount: number
  ): void {
    if (builderEditTimeoutRef.current) {
      clearTimeout(builderEditTimeoutRef.current);
    }

    builderEditTimeoutRef.current = setTimeout(() => {
      trackStudioEvent("builder_edit_made", {
        nodeCount: nextBuilderCourse.nodes.length,
        validationIssueCount: issueCount,
      });
    }, 1000);
  }

  function markFirstPreviewOpened(courseId: string): void {
    if (onboardingState.firstPreviewOpened) {
      return;
    }

    const nextOnboardingState = recordStudioFirstPreviewOpened(
      getBrowserStorage(),
      onboardingState
    );

    setOnboardingState(nextOnboardingState);
    trackStudioEvent("first_preview_opened", {
      courseId,
    });
  }

  function activateStarterSelection(input: {
    projectId: string;
    templateId: string;
    variantId: string;
    themeId: string;
    authoringMode: AuthoringMode;
    feedbackState: FeedbackState;
  }): void {
    const project =
      availableProjects.find((candidate) => candidate.id === input.projectId) ?? null;
    const pack =
      availablePacks.find((candidate) => candidate.id === input.projectId) ?? null;
    const template =
      project?.templates.find((candidate) => candidate.id === input.templateId) ??
      pack?.templates.find((candidate) => candidate.id === input.templateId) ??
      null;
    const variant =
      template?.variants.find((candidate) => candidate.id === input.variantId) ?? null;
    const theme =
      (project?.themes ?? themePacks).find(
        (candidate) => candidate.id === input.themeId
      ) ?? null;

    if (!pack || !template || !variant) {
      setFeedback({
        tone: "error",
        title: "Starter example unavailable",
        message:
          "The selected starter path could not be loaded from the shipped source projects.",
      });
      return;
    }

    if (project && theme) {
      setActiveThemeId(theme.id);
    }

    loadTemplateVariant(pack, template, variant, input.feedbackState, project);
    setAuthoringMode(input.authoringMode);
    setActiveStudioSurface(input.authoringMode);
    markFirstPreviewOpened(template.id);
  }

  function handleDismissPathChooser(): void {
    setIsPathChooserOpen(false);
    const nextState = dismissStudioOnboarding(
      getBrowserStorage(),
      onboardingState
    );
    setOnboardingState(nextState);
  }

  function handleChooseStartingPath(pathId: StudioStartingPath): void {
    const path = getStudioStartingPath(pathId);
    const storage = getBrowserStorage();
    const nextState = completeStudioOnboardingPath(storage, onboardingState, pathId);

    setOnboardingState(nextState);
    setIsPathChooserOpen(false);
    activateStarterSelection({
      projectId: path.recommendedProjectId,
      templateId: path.recommendedTemplateId,
      variantId: path.recommendedVariantId,
      themeId: path.recommendedThemeId,
      authoringMode: path.authoringMode,
      feedbackState: {
        tone: "success",
        title: `${path.label} path ready`,
        message: path.description,
      },
    });
    trackStudioEvent("onboarding_completed", {
      pathId,
    });
  }

  function handleDismissStartHerePanel(): void {
    const nextState = dismissStudioStartHerePanel(
      getBrowserStorage(),
      onboardingState
    );
    setOnboardingState(nextState);
  }

  function handleOpenStarterExample(exampleId: string): void {
    const example = STARTER_EXAMPLES.find((candidate) => candidate.id === exampleId);

    if (!example) {
      return;
    }

    activateStarterSelection({
      projectId: example.projectId,
      templateId: example.templateId,
      variantId: example.variantId,
      themeId: example.themeId,
      authoringMode: example.authoringMode,
      feedbackState: {
        tone: "info",
        title: `${example.title} loaded`,
        message: example.description,
      },
    });
    trackStudioEvent("starter_template_selected", {
      exampleId: example.id,
      projectId: example.projectId,
      templateId: example.templateId,
      variantId: example.variantId,
    });
  }

  function handleResetBuilderToTemplateDefaults(): void {
    if (!selectedPack || !selectedTemplate) {
      return;
    }

    const resetVariant = selectedVariant ?? selectedTemplate.variants[0];

    if (!resetVariant) {
      return;
    }

    loadTemplateVariant(
      selectedPack,
      selectedTemplate,
      resetVariant,
      {
        tone: "info",
        title: "Builder reset to template defaults",
        message:
          "The current builder draft was reset to the selected template and variable-set defaults.",
      },
      selectedProject
    );
    setAuthoringMode("builder");
    setActiveStudioSurface("builder");
  }

  function handleResetVariablesToDefaults(): void {
    if (!selectedTemplate) {
      return;
    }

    const resetVariant = selectedVariant ?? selectedTemplate.variants[0];

    if (!resetVariant) {
      return;
    }

    const nextTemplateDraft = inspectTemplateDraft(
      draftYaml,
      resetVariant.values,
      selectedVariableSchema
    );

    setTemplateDataValues(resetVariant.values);
    setActiveStudioSurface("variables");

    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    if (authoringMode === "builder") {
      applyBuilderCourse(
        builderDraft,
        {
          tone: "info",
          title: "Variable defaults restored",
          message:
            "Template variables were reset to the selected starter defaults while keeping the current structured source intact.",
        },
        resetVariant.values,
        selectedVariableSchema
      );
      return;
    }

    updateDraftPipeline(
      draftYaml,
      resetVariant.values,
      {
        tone: "info",
        title: "Variable defaults restored",
        message:
          "Template variables were reset to the selected starter defaults.",
      },
      true,
      selectedVariableSchema
    );
  }

  function handleCompile(): void {
    const nextSnapshot = updateDraftPipeline(
      draftYaml,
      templateDataValues,
      undefined,
      true,
      selectedVariableSchema
    );
    setCompiledBuild(nextSnapshot);
    clearLastExportedPackage();
    clearLastBatchExport();
    setActiveStudioSurface("preview");

    setFeedback(
      nextSnapshot.previewModel
        ? {
            tone: "success",
            title: "Validated source compiled",
            message:
              "Canonical source, preview model, and export build are in sync. The compiled preview is ready for export.",
          }
        : {
            tone: "error",
            title: "Build failed",
            message:
              "Fix the source, template, or graph issues below, then compile again before previewing or exporting.",
          }
    );

    if (nextSnapshot.previewModel) {
      trackStudioEvent("preview_opened", {
        courseId: nextSnapshot.previewModel.id,
        reason: "manual_compile",
      });
      markFirstPreviewOpened(nextSnapshot.previewModel.id);
    } else if (nextSnapshot.errors.length > 0) {
      trackStudioEvent("validation_issues_detected", {
        issueCount: nextSnapshot.errors.length,
        authoringMode,
      });
    }
  }

  function handleValidateProject(): void {
    const nextSnapshot = updateDraftPipeline(
      draftYaml,
      templateDataValues,
      undefined,
      true,
      selectedVariableSchema
    );
    setCompiledBuild(nextSnapshot);
    setActiveStudioSurface("export");

    const nextExportPlan = nextSnapshot.exportModel
      ? buildScormExportPreview(nextSnapshot.exportModel, {
          mode: exportMode,
          validationCatalog,
          themePack: selectedThemePack,
          buildContext:
            selectedProject && selectedTemplate && selectedThemePack
              ? buildCourseProjectBuildContext({
                  project: selectedProject,
                  template: selectedTemplate,
                  variant:
                    selectedVariant ?? {
                      id: activeVariantId ?? variantDraftId,
                      templateId: selectedTemplate.id,
                      title: variantDraftTitle,
                      description: "",
                      notes: "",
                      values: templateDataValues,
                      valuesYaml: serializeTemplateDataYaml(templateDataValues),
                    },
                  theme: selectedThemePack,
                  snapshot: nextSnapshot,
                })
              : activeBuildContext,
        })
      : null;
    const isProjectReady =
      (selectedProject?.validation.ready ?? true) &&
      Boolean(nextExportPlan?.metadata.preflight.ready);

    appendBuildHistory({
      id: `${Date.now()}-validate`,
      timestamp: new Date().toISOString(),
      label: "Project validation",
      success: isProjectReady,
      target: `${selectedTemplate?.id ?? "custom-source"} / ${variantDraftId} / ${
        selectedThemePack?.id ?? "theme"
      }`,
      themeName: selectedThemePack?.name ?? null,
      fileName: null,
      objectUrl: null,
      manifestAvailable: false,
    });

    setFeedback(
      isProjectReady
        ? {
            tone: "success",
            title: "Project validation passed",
            message:
              "Project integrity, canonical compilation, and SCORM preflight passed for the selected target.",
          }
        : {
            tone: "error",
            title: "Project validation failed",
            message:
              nextSnapshot.errors[0] ??
              nextExportPlan?.metadata.preflight.checks.find((check) => !check.passed)
                ?.details ??
              "Project validation found issues in source, references, or SCORM preflight.",
          }
    );

    if (!isProjectReady) {
      trackStudioEvent("validation_issues_detected", {
        issueCount: nextSnapshot.errors.length,
        authoringMode,
        exportMode,
      });
    }
  }

  function loadTemplateVariant(
    pack: TemplatePack,
    template: TemplatePackTemplate,
    variant: TemplatePackVariant,
    nextFeedback: FeedbackState,
    projectOverride: CourseProject | null = null
  ): void {
    const matchingProject =
      projectOverride ??
      availableProjects.find((project) => project.id === pack.id) ??
      null;

    setActiveProjectId(matchingProject?.id ?? null);
    setActivePackId(pack.id);
    setActiveTemplateId(template.id);
    setActiveVariantId(variant.id);
    setVariantDraftId(variant.id);
    setVariantDraftTitle(variant.title);
    setSelectedBatchVariantIds([variant.id]);
    setAuthoringMode("builder");
    setDraftYaml(template.yaml);
    setSourceLabel(
      matchingProject
        ? `Source project variant: ${variant.title}`
        : `Template pack variant: ${variant.title}`
    );
    clearLastExportedPackage();
    clearLastBatchExport();
    setTemplateDataValues(variant.values);

    const nextTemplateDraft = inspectTemplateDraft(
      template.yaml,
      variant.values,
      template.variableSchema
    );
    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    const nextSnapshot = updateDraftPipeline(
      template.yaml,
      variant.values,
      nextFeedback,
      true,
      template.variableSchema
    );
    setCompiledBuild(nextSnapshot);

    if (nextSnapshot.previewModel) {
      trackStudioEvent("preview_opened", {
        courseId: nextSnapshot.previewModel.id,
        reason: "template_variant_loaded",
      });
    }
  }

  function handleSelectPack(pack: TemplatePack): void {
    const nextTemplate = pack.templates[0];
    const nextVariant = nextTemplate?.variants[0];
    const matchingProject =
      availableProjects.find((project) => project.id === pack.id) ?? null;

    if (!nextTemplate || !nextVariant) {
      return;
    }

    if (matchingProject) {
      setActiveProjectId(matchingProject.id);
      setActiveThemeId(
        matchingProject.themes.find(
          (themePack) => themePack.id === matchingProject.defaultThemeId
        )?.id ??
          matchingProject.themes[0]?.id ??
          activeThemeId
      );
    }

    setActiveStudioSurface("project");
    loadTemplateVariant(pack, nextTemplate, nextVariant, {
      tone: "info",
      title: matchingProject ? "Source project loaded" : "Template pack loaded",
      message: matchingProject
        ? `${matchingProject.title} is ready. Choose a template, variable set, and theme to generate a reproducible project build.`
        : `${pack.title} is ready. Choose a template and variable set to generate a repeatable course variant.`,
    }, matchingProject);
    trackStudioEvent("template_selected", {
      packId: pack.id,
      templateId: nextTemplate.id,
      variantId: nextVariant.id,
      sourceType: matchingProject ? "project" : "template-pack",
    });
  }

  function handleSelectTemplate(template: TemplatePackTemplate): void {
    if (!selectedPack) {
      return;
    }

    const nextVariant = template.variants[0];

    if (!nextVariant) {
      return;
    }

    setActiveStudioSurface("project");
    loadTemplateVariant(selectedPack, template, nextVariant, {
      tone: "info",
      title: selectedProject ? "Project template loaded" : "Template loaded",
      message: selectedProject
        ? `${template.title} is now the active shared source inside ${selectedProject.title}.`
        : `${template.title} is now the active shared source for this course family.`,
    }, selectedProject);
    trackStudioEvent("template_selected", {
      templateId: template.id,
      variantId: nextVariant.id,
      sourceType: selectedProject ? "project" : "template-pack",
    });
  }

  function handleSelectVariant(variant: TemplatePackVariant): void {
    if (!selectedPack || !selectedTemplate) {
      return;
    }

    setActiveStudioSurface("variables");
    loadTemplateVariant(selectedPack, selectedTemplate, variant, {
      tone: "info",
      title: "Variable set applied",
      message: `${variant.title} is now driving the compiled preview and export build${
        selectedProject ? ` for ${selectedProject.title}` : ""
      }.`,
    }, selectedProject);
    trackStudioEvent("variant_selected", {
      variantId: variant.id,
      templateId: selectedTemplate.id,
    });
  }

  function handleSelectThemePack(themePack: ThemePack): void {
    setActiveThemeId(themePack.id);
    setActiveStudioSurface("theme");
    clearLastExportedPackage();
    clearLastBatchExport();
    setFeedback({
      tone: "info",
      title: "Theme pack applied",
      message: `${themePack.name} now drives the compiled preview and export build while the source definition stays unchanged.`,
    });
  }

  function handleResetToSelectedVariant(): void {
    if (!selectedPack || !selectedTemplate || !selectedVariant) {
      return;
    }

    setActiveStudioSurface("variables");
    loadTemplateVariant(selectedPack, selectedTemplate, selectedVariant, {
      tone: "info",
      title: "Variant reset",
      message: `${selectedVariant.title} has been restored to its pack defaults.`,
    }, selectedProject);
  }

  function handleResetDemo(): void {
    clearAllRuntimeStates();
    clearLastExportedPackage();
    clearLastBatchExport();
    setActiveProjectId(defaultProject?.id ?? null);
    setActivePackId(defaultPack.id);
    setActiveTemplateId(defaultTemplate.id);
    setActiveThemeId(defaultThemePack.id);
    setActiveVariantId(defaultVariant.id);
    setVariantDraftId(defaultVariant.id);
    setVariantDraftTitle(defaultVariant.title);
    setDraftYaml(defaultTemplate.yaml);
    setActiveStudioSurface("builder");
    setSourceLabel(
      defaultProject
        ? `Source project variant: ${defaultVariant.title}`
        : `Template pack variant: ${defaultVariant.title}`
    );
    setIsAuthoringGuideOpen(false);
    setFeedback({
      tone: "info",
      title: "Demo reset",
      message:
        defaultProject
          ? "The default source project, selected variant, preview state, and onboarding state have been reset."
          : "The default pack, variant values, preview state, and onboarding state have been reset.",
    });

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_WALKTHROUGH_STORAGE_KEY);
    }
    setOnboardingState(resetStudioOnboardingState(getBrowserStorage()));
    setIsPathChooserOpen(true);

    const nextTemplateDraft = inspectTemplateDraft(
      defaultTemplate.yaml,
      defaultTemplateData,
      defaultTemplate.variableSchema
    );
    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    setTemplateDataValues(defaultTemplateData);
    setSelectedBatchVariantIds([defaultVariant.id]);

    const nextSnapshot = updateDraftPipeline(
      defaultTemplate.yaml,
      defaultTemplateData,
      undefined,
      true,
      defaultTemplate.variableSchema
    );
    setCompiledBuild(nextSnapshot);
    setTourInstanceKey((currentValue) => currentValue + 1);
    setAuthoringMode("builder");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (templateDataFileInputRef.current) {
      templateDataFileInputRef.current.value = "";
    }
  }

  function handleYamlChange(source: string): void {
    setDraftYaml(source);
    setActiveStudioSurface("source");
    clearLastExportedPackage();
    clearLastBatchExport();
    setActiveVariantId(null);
    setSourceLabel("Custom source draft");

    const nextTemplateData = syncTemplateDraft(source, true, selectedVariableSchema);
    updateDraftPipeline(source, nextTemplateData, undefined, true, selectedVariableSchema);
  }

  function handleTemplateDataChange(
    key: string,
    value: TemplateScalarValue
  ): void {
    setActiveStudioSurface("variables");
    const nextTemplateData = {
      ...templateDataValues,
      [key]: value,
    };

    setTemplateDataValues(nextTemplateData);
    clearLastExportedPackage();
    clearLastBatchExport();

    if (authoringMode === "builder") {
      applyBuilderCourse(
        builderDraft,
        {
          tone: "info",
          title: "Template variables updated",
          message:
            "The shared source and compiled variant were regenerated from the latest variable values.",
        },
        nextTemplateData,
        selectedVariableSchema
      );
      return;
    }

    updateDraftPipeline(
      draftYaml,
      nextTemplateData,
      undefined,
      true,
      selectedVariableSchema
    );
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedYaml = await file.text();
      const nextTemplateDraft = inspectTemplateDraft(
        uploadedYaml,
        templateDataValues,
        selectedVariableSchema
      );

      setActiveVariantId(null);
      setDraftYaml(uploadedYaml);
      const uploadedBaseName = file.name.replace(/\.[^/.]+$/, "");
      setVariantDraftTitle(uploadedBaseName);
      setVariantDraftId(uploadedBaseName);
      setSourceLabel(`Uploaded file: ${file.name}`);
      clearLastExportedPackage();
      clearLastBatchExport();
      setAuthoringMode("source");
      setActiveStudioSurface("source");

      if (nextTemplateDraft) {
        setTemplateFields(nextTemplateDraft.fields);
      }

      const nextSnapshot = updateDraftPipeline(
        uploadedYaml,
        templateDataValues,
        undefined,
        true,
        selectedVariableSchema
      );
      setCompiledBuild(nextSnapshot);
      setFeedback(
        nextSnapshot.previewModel
          ? {
              tone: "success",
              title: "YAML file loaded",
              message: `${file.name} parsed into the canonical model successfully and is ready for preview or export.`,
            }
          : {
              tone: "error",
              title: "Uploaded YAML has issues",
              message:
                "The file was loaded, but syntax, branching, or template validation still needs attention.",
            }
      );
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "File upload failed",
        message:
          error instanceof Error
            ? error.message
            : "The YAML file could not be read.",
      });
    } finally {
      input.value = "";
    }
  }

  async function handleTemplateDataUpload(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedTemplateData = parseTemplateDataYaml(await file.text());
      const nextTemplateDraft = inspectTemplateDraft(
        draftYaml,
        uploadedTemplateData,
        selectedVariableSchema
      );

      setTemplateDataValues(uploadedTemplateData);
      setActiveStudioSurface("variables");
      clearLastBatchExport();

      if (nextTemplateDraft) {
        setTemplateFields(nextTemplateDraft.fields);
      }

      const nextSnapshot = updateDraftPipeline(
        draftYaml,
        uploadedTemplateData,
        {
          tone: "success",
          title: "Template data imported",
          message: `${file.name} was applied to the current source definition and compiled as a variant draft.`,
        },
        authoringMode !== "builder",
        selectedVariableSchema
      );

      if (authoringMode === "builder" && nextSnapshot.canonicalCourse) {
        syncBuilderFromCompiledCourse(nextSnapshot.canonicalCourse);
      }
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Template data import failed",
        message:
          error instanceof Error
            ? error.message
            : "The template data file could not be read.",
      });
    } finally {
      input.value = "";
    }
  }

  function handleSyncBuilderFromSource(): void {
    const nextSnapshot = updateDraftPipeline(
      draftYaml,
      templateDataValues,
      undefined,
      true,
      selectedVariableSchema
    );

    if (!nextSnapshot.canonicalCourse) {
      setFeedback({
        tone: "error",
        title: "Guided Editor sync failed",
        message:
          "Fix the current source issues first, then sync the builder from the canonical normalized source definition.",
      });
      return;
    }

    setAuthoringMode("builder");
    setActiveStudioSurface("builder");
    setFeedback({
      tone: "success",
      title: "Guided Editor synced",
      message:
        "Guided Editor now reflects the latest validated course source. Advanced template constructs are flattened into the guided editing model.",
    });
  }

  function handleDownloadSourceYaml(): void {
    const projectDirectory = inferCourseProjectDirectory(
      draftYaml,
      activeSnapshot.canonicalCourse?.id ??
        variantDraftId ??
        selectedTemplate?.id ??
        "course-variant"
    );

    downloadTextFile(
      buildSourceDownloadFileName(projectDirectory, "course"),
      draftYaml
    );
  }

  function handleDownloadTemplateData(): void {
    const projectDirectory = inferCourseProjectDirectory(
      draftYaml,
      activeSnapshot.canonicalCourse?.id ??
        variantDraftId ??
        selectedTemplate?.id ??
        "course-variant"
    );

    downloadTextFile(
      buildSourceDownloadFileName(projectDirectory, "template-data"),
      serializeTemplateDataYaml(templateDataValues)
    );
  }

  function handleDownloadSourceReadme(): void {
    const projectDirectory = inferCourseProjectDirectory(
      draftYaml,
      activeSnapshot.canonicalCourse?.id ??
        variantDraftId ??
        selectedTemplate?.id ??
        "course-variant"
    );
    const title =
      activeSnapshot.canonicalCourse?.title ?? variantDraftTitle ?? "Course Variant";
    const templateName =
      selectedTemplate?.id ??
      activeSnapshot.canonicalCourse?.id ??
      "custom-template";

    downloadTextFile(
      `${projectDirectory}-README.md`,
      buildCourseProjectReadme({
        title,
        templateName,
        projectDirectory,
      })
    );
  }

  function handleDownloadValidationNotes(): void {
    const courseId =
      activeSnapshot.canonicalCourse?.id ??
      variantDraftId ??
      selectedTemplate?.id ??
      "training-course";
    const notes =
      lastExportedPackage?.validationNotes ?? exportPlan?.validationNotes ?? "";

    if (!notes) {
      return;
    }

    downloadTextFile(`${courseId}-validation-notes.txt`, notes);
  }

  function handleDownloadTemplateSource(): void {
    if (!selectedTemplate) {
      return;
    }

    downloadTextFile(`${selectedTemplate.id}-template.yaml`, selectedTemplate.yaml);
  }

  async function handleExportProjectSource(): Promise<void> {
    if (!selectedProject) {
      return;
    }

    setActiveStudioSurface("project");
    const archive = await exportCourseProjectSourceArchive(selectedProject);
    const objectUrl = window.URL.createObjectURL(archive.blob);

    downloadPackage(archive.fileName, objectUrl);
    window.URL.revokeObjectURL(objectUrl);
    trackStudioEvent("project_exported", {
      projectId: selectedProject.id,
      archiveFileName: archive.fileName,
    });
    trackStudioEvent("starter_repo_downloaded", {
      projectId: selectedProject.id,
      archiveFileName: archive.fileName,
    });
    setFeedback({
      tone: "success",
      title: "Project source exported",
      message:
        "The source project archive includes project metadata, templates, variable sets, themes, and assets. SCORM builds remain separate artifacts.",
    });
  }

  async function handleImportProjectSource(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const importedProject = await importCourseProjectSourceArchive(file);
      const importedPack = courseProjectToTemplatePack(importedProject);
      const importedTemplate =
        importedProject.templates.find(
          (template) => template.id === importedProject.defaultTemplateId
        ) ?? importedProject.templates[0];
      const importedVariant =
        importedTemplate?.variants.find(
          (variant) => variant.id === importedProject.defaultVariantId
        ) ?? importedTemplate?.variants[0];
      const importedThemeId =
        importedProject.themes.find(
          (themePack) => themePack.id === importedProject.defaultThemeId
        )?.id ?? importedProject.themes[0]?.id ?? null;

      if (!importedTemplate || !importedVariant) {
        throw new Error(
          `Imported project "${importedProject.id}" does not include a valid default template and variant.`
        );
      }

      setAvailableProjects((currentProjects) =>
        [...currentProjects.filter((project) => project.id !== importedProject.id), importedProject]
          .sort((leftProject, rightProject) =>
            leftProject.title.localeCompare(rightProject.title)
          )
      );
      setActiveProjectId(importedProject.id);
      setActivePackId(importedPack.id);
      setActiveThemeId(importedThemeId);
      setActiveStudioSurface("project");

      loadTemplateVariant(importedPack, importedTemplate, importedVariant, {
        tone: "success",
        title: "Project source imported",
        message:
          "The project archive was validated, loaded into the canonical model, and is ready for preview or export.",
      }, importedProject);
      trackStudioEvent("project_imported", {
        projectId: importedProject.id,
        templateId: importedTemplate.id,
        variantId: importedVariant.id,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Project import failed",
        message:
          error instanceof Error
            ? error.message
            : "The project source archive could not be imported.",
      });
    } finally {
      input.value = "";
    }
  }

  function handleDuplicateVariant(): void {
    const duplicatedVariant = createDuplicatedVariantDraft({
      variantId: activeVariantId ?? variantDraftId,
      variantTitle: variantDraftTitle,
      values: templateDataValues,
    });

    setActiveVariantId(null);
    setVariantDraftId(duplicatedVariant.variantId);
    setVariantDraftTitle(duplicatedVariant.title);
    setSourceLabel(duplicatedVariant.sourceLabel);
    setActiveStudioSurface("variables");
    clearLastExportedPackage();
    clearLastBatchExport();
    setAuthoringMode("builder");
    setTemplateDataValues(duplicatedVariant.values);

    const nextSnapshot = updateDraftPipeline(
      draftYaml,
      duplicatedVariant.values,
      {
        tone: "success",
        title: "Variant duplicated",
        message: `You now have a local variant draft. Suggested variable-set file: ${duplicatedVariant.suggestedFileName}.`,
      },
      true,
      selectedVariableSchema
    );
    setCompiledBuild(nextSnapshot);

    const nextTemplateDraft = inspectTemplateDraft(
      draftYaml,
      duplicatedVariant.values,
      selectedVariableSchema
    );

    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    if (nextSnapshot.canonicalCourse) {
      syncBuilderFromCompiledCourse(nextSnapshot.canonicalCourse);
    }
  }

  function handleInsertSharedModule(): void {
    if (!selectedSharedModule) {
      return;
    }

    try {
      const effectiveIncludeOverrides = Object.fromEntries(
        Object.entries(moduleIncludeValues).filter(([key, value]) => {
          const field = selectedModuleFields.find((candidate) => candidate.key === key);
          const moduleDefaultValue =
            selectedSharedModule.templateData[key] ?? field?.value ?? "";

          return value !== moduleDefaultValue;
        })
      );
      const nextSource = insertSharedModuleIntoYaml(
        draftYaml,
        selectedSharedModule.id,
        selectedSharedModule.version,
        effectiveIncludeOverrides
      );
      setAuthoringMode("source");
      setActiveStudioSurface("source");
      setDraftYaml(nextSource);
      clearLastExportedPackage();
      clearLastBatchExport();
      setSourceLabel(`Course source updated with ${selectedSharedModule.id}`);
      updateDraftPipeline(
        nextSource,
        templateDataValues,
        {
          tone: "success",
          title: "Shared module inserted",
          message:
            "The module include was appended to the source definition with the current variable overrides. Wire the next-step references in source mode so the new shared step participates in the course flow.",
        },
        false,
        selectedVariableSchema
      );
      trackStudioEvent("shared_module_included", {
        moduleId: selectedSharedModule.id,
        moduleVersion: selectedSharedModule.version,
        overrideCount: Object.keys(effectiveIncludeOverrides).length,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Shared module insert failed",
        message:
          error instanceof Error
            ? error.message
            : "The shared module could not be inserted into the current source definition.",
      });
    }
  }

  function handleExtractSharedModule(): void {
    if (!moduleExtractStepId) {
      return;
    }

    if (!moduleDraftId.trim() || !moduleDraftTitle.trim() || !moduleDraftCategory.trim()) {
      setFeedback({
        tone: "error",
        title: "Module draft needs details",
        message:
          "Choose a source step, then provide a module id, title, and category before extracting a reusable module draft.",
      });
      return;
    }

    try {
      const extracted = extractSharedModuleFromYaml({
        source: draftYaml,
        nodeId: moduleExtractStepId,
        moduleId: moduleDraftId,
        title: moduleDraftTitle,
        description: moduleDraftDescription || `Reusable module extracted from ${moduleExtractStepId}.`,
        category: moduleDraftCategory,
        tags: moduleDraftTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setAuthoringMode("source");
      setActiveStudioSurface("source");
      setDraftYaml(extracted.nextSource);
      clearLastExportedPackage();
      clearLastBatchExport();
      setSourceLabel(`Course source extracted ${moduleExtractStepId} into ${moduleDraftId}`);
      updateDraftPipeline(
        extracted.nextSource,
        templateDataValues,
        {
          tone: "success",
          title: "Shared module draft generated",
          message:
            "The selected step was replaced with a pinned shared-module include. Review the downloaded module source and registry entry, then add them to module-library/ before rebuilding.",
        },
        false,
        selectedVariableSchema
      );
      downloadTextFile(`${moduleDraftId}.yaml`, extracted.moduleSource);
      downloadTextFile(`${moduleDraftId}.registry-entry.yaml`, extracted.registryEntrySource);
      trackStudioEvent("shared_module_extracted", {
        moduleId: moduleDraftId,
        sourceStepId: moduleExtractStepId,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Shared module extraction failed",
        message:
          error instanceof Error
            ? error.message
            : "The selected step could not be extracted into a shared module draft.",
      });
    }
  }

  async function handleBuildAffectedModuleTargets(): Promise<void> {
    if (!selectedProject || selectedProjectAffectedTargets.length === 0) {
      return;
    }

    setIsBatchExporting(true);
    setActiveStudioSurface("export");

    try {
      const selections = selectedProjectAffectedTargets.map((target) => {
        const [templateId, variantId, themeId] = target.targetKey.split("/");

        return {
          templateId,
          variantId,
          themeId,
        };
      });
      const bundle = await exportCourseProjectBuildMatrix(selectedProject, {
        selections,
        mode: exportMode,
        validationCatalog,
        moduleLibrary,
      });
      const objectUrl = window.URL.createObjectURL(bundle.blob);
      const historyObjectUrl = window.URL.createObjectURL(bundle.blob);

      clearLastBatchExport();
      batchExportObjectUrlRef.current = objectUrl;
      setLastBatchExport({
        fileName: bundle.fileName,
        objectUrl,
        summary: bundle.summary,
      });
      appendBuildHistory({
        id: `${Date.now()}-${bundle.fileName}`,
        timestamp: new Date().toISOString(),
        label: "Affected rebuild",
        success: true,
        target: `${selectedProject.id} / ${selections.length} affected build${selections.length === 1 ? "" : "s"}`,
        themeName: null,
        fileName: bundle.fileName,
        objectUrl: historyObjectUrl,
        manifestAvailable: true,
      });
      downloadPackage(bundle.fileName, objectUrl);
      setFeedback({
        tone: "success",
        title: "Affected builds generated",
        message:
          "Only the current project's targets that depend on the selected shared module were rebuilt.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Affected rebuild failed",
        message:
          error instanceof Error
            ? error.message
            : "The affected builds could not be generated.",
      });
    } finally {
      setIsBatchExporting(false);
    }
  }

  function downloadLogicTestReport(
    kind: "json" | "markdown",
    run: CourseProjectLogicTestRun
  ): void {
    const baseName = `${run.report.projectId}-course-tests`;

    if (kind === "json") {
      downloadTextFile(`${baseName}.json`, JSON.stringify(run.report, null, 2));
      return;
    }

    downloadTextFile(`${baseName}.md`, run.summaryMarkdown);
  }

  async function handleRunLogicTests(): Promise<void> {
    if (!selectedProject) {
      return;
    }

    setIsRunningLogicTests(true);
    setActiveStudioSurface("export");

    try {
      const run = runCourseProjectLogicTests(selectedProject, {
        selection: activeProjectBuildSelection ?? undefined,
        moduleLibrary,
      });

      setLogicTestRun(run);
      trackStudioEvent("logic_tests_run", {
        projectId: selectedProject.id,
        totalTests: run.report.totalTests,
        failedTests: run.report.failedTests,
        filteredToActiveTarget: Boolean(activeProjectBuildSelection),
      });
      setFeedback(
        run.report.success
          ? {
              tone: "success",
              title: "Course logic tests passed",
              message:
                run.report.totalTests > 0
                  ? "Branching, score, completion, and pass/fail checks passed for the current project scope."
                  : "No matching course logic tests were found for the current project scope.",
            }
          : {
              tone: "error",
              title: "Course logic tests failed",
              message:
                "One or more learner-path expectations failed. Review the failing tests before exporting a new build.",
            }
      );
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Logic test run failed",
        message:
          error instanceof Error
            ? error.message
            : "The project logic tests could not be executed.",
      });
    } finally {
      setIsRunningLogicTests(false);
    }
  }

  async function handleExport(): Promise<void> {
    if (!compiledSnapshot.exportModel) {
      return;
    }

    setIsExporting(true);
    setActiveStudioSurface("export");
    trackStudioEvent("export_attempted", {
      courseId: compiledSnapshot.exportModel.id,
      courseTitle: compiledSnapshot.exportModel.title,
      exportMode,
      themeId: selectedThemePack?.id ?? "none",
    });

    try {
      if (selectedProject && requirePassingTestsBeforeExport) {
        const testRun = runCourseProjectLogicTests(selectedProject, {
          selection: activeProjectBuildSelection ?? undefined,
          moduleLibrary,
        });

        setLogicTestRun(testRun);
        trackStudioEvent("logic_tests_run", {
          projectId: selectedProject.id,
          totalTests: testRun.report.totalTests,
          failedTests: testRun.report.failedTests,
          trigger: "pre-export-guard",
        });

        if (!testRun.report.success) {
          setFeedback({
            tone: "error",
            title: "Export blocked by failing logic tests",
            message:
              "Enable export only after the current project logic tests pass, or disable the pre-export test guard.",
          });
          return;
        }
      }

      const bundle = await exportCourseAsScormZip(compiledSnapshot.exportModel, {
        mode: exportMode,
        validationCatalog,
        themePack: selectedThemePack,
        buildContext: activeBuildContext,
      });
      const fileName = bundle.fileName;
      const objectUrl = window.URL.createObjectURL(bundle.blob);
      const historyObjectUrl = window.URL.createObjectURL(bundle.blob);

      clearLastExportedPackage();
      exportObjectUrlRef.current = objectUrl;
      setLastExportedPackage({
        fileName,
        objectUrl,
        contents: bundle.metadata.packageContents,
        metadata: bundle.metadata,
        validationNotes: bundle.validationNotes,
      });
      appendBuildHistory({
        id: `${Date.now()}-${bundle.metadata.outputFileName}`,
        timestamp: bundle.metadata.builtAt,
        label:
          bundle.metadata.exportMode === "validation"
            ? "Validation build"
            : "Project build",
        success: true,
        target: `${bundle.metadata.templateId ?? selectedTemplate?.id ?? "custom-source"} / ${
          bundle.metadata.variantId ?? variantDraftId
        } / ${bundle.metadata.themeId ?? selectedThemePack?.id ?? "theme"}`,
        themeName: bundle.metadata.themeName,
        fileName,
        objectUrl: historyObjectUrl,
        manifestAvailable: bundle.metadata.packageContents.includes("build-manifest.json"),
      });
      downloadPackage(fileName, objectUrl);

      const isFirstExport = !onboardingState.firstExportCompleted;
      const nextOnboardingState = recordStudioFirstExportCompleted(
        getBrowserStorage(),
        onboardingState
      );
      setOnboardingState(nextOnboardingState);
      setIsPackageViewerOpen(isFirstExport);

      if (isFirstExport) {
        trackStudioEvent("first_export_completed", {
          courseId: bundle.metadata.courseId,
          exportMode: bundle.metadata.exportMode,
          themeId: bundle.metadata.themeId ?? "none",
        });
      }

      const exportFeedback = buildFirstExportFeedback({
        firstExportCompleted: onboardingState.firstExportCompleted,
        exportMode,
      });

      setFeedback({
        tone: "success",
        title: exportFeedback.title,
        message: exportFeedback.message,
      });
      trackStudioEvent("export_succeeded", {
        courseId: bundle.metadata.courseId,
        exportMode: bundle.metadata.exportMode,
        themeId: bundle.metadata.themeId ?? "none",
      });
    } catch (error) {
      clearLastExportedPackage();
      appendBuildHistory({
        id: `${Date.now()}-single-failed`,
        timestamp: new Date().toISOString(),
        label: "Project build",
        success: false,
        target: `${selectedTemplate?.id ?? "custom-source"} / ${variantDraftId} / ${
          selectedThemePack?.id ?? "theme"
        }`,
        themeName: selectedThemePack?.name ?? null,
        fileName: null,
        objectUrl: null,
        manifestAvailable: false,
      });
      setFeedback({
        tone: "error",
        title: "Export failed",
        message:
          error instanceof Error
            ? error.message
            : "The SCORM package could not be generated.",
      });
      trackStudioEvent("export_failed", {
        templateId: selectedTemplate?.id ?? "custom-source",
        variantId: variantDraftId,
        themeId: selectedThemePack?.id ?? "theme",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleBatchExport(): Promise<void> {
    if (!selectedPack || !selectedTemplate) {
      return;
    }

    setIsBatchExporting(true);
    setActiveStudioSurface("export");
    trackStudioEvent("export_attempted", {
      buildType: "batch-family",
      variantCount: selectedBatchVariantIds.length,
      exportMode,
    });

    try {
      const builds = selectedTemplate.variants
        .filter((variant) => selectedBatchVariantIds.includes(variant.id))
        .map((variant) => {
          const snapshot = buildPipelineSnapshot(
            selectedTemplate.yaml,
            variant.values,
            selectedTemplate.variableSchema,
            moduleLibrary
          );

          if (!snapshot.exportModel) {
            throw new Error(
              `Variant "${variant.title}" is not ready to export. ${snapshot.errors[0] ?? ""}`.trim()
            );
          }

          return {
            projectId: selectedProject?.id ?? null,
            projectTitle: selectedProject?.title ?? null,
            projectVersion: selectedProject?.version ?? null,
            packId: selectedPack.id,
            packTitle: selectedPack.title,
            templateId: selectedTemplate.id,
            templateTitle: selectedTemplate.title,
            variantId: variant.id,
            variantTitle: variant.title,
            course: snapshot.exportModel,
            themePack: selectedThemePack,
            buildContext:
              selectedProject && selectedThemePack
                ? buildCourseProjectBuildContext({
                    project: selectedProject,
                    template: selectedTemplate,
                    variant,
                    theme: selectedThemePack,
                    snapshot,
                  })
                : null,
          };
        });
      const bundle = await exportCourseFamilyBuildBundle(builds, {
        mode: exportMode,
        validationCatalog,
        themePack: selectedThemePack,
      });
      const objectUrl = window.URL.createObjectURL(bundle.blob);
      const historyObjectUrl = window.URL.createObjectURL(bundle.blob);

      clearLastBatchExport();
      batchExportObjectUrlRef.current = objectUrl;
      setLastBatchExport({
        fileName: bundle.fileName,
        objectUrl,
        summary: bundle.summary,
      });
      appendBuildHistory({
        id: `${Date.now()}-${bundle.fileName}`,
        timestamp: new Date().toISOString(),
        label: "Batch variant build",
        success: true,
        target: `${selectedTemplate.id} / ${selectedBatchVariantIds.length} variants / ${
          selectedThemePack?.id ?? "theme"
        }`,
        themeName: selectedThemePack?.name ?? null,
        fileName: bundle.fileName,
        objectUrl: historyObjectUrl,
        manifestAvailable: true,
      });
      downloadPackage(bundle.fileName, objectUrl);

      setFeedback({
        tone: "success",
        title: "Course family build generated",
        message:
          "The selected variants were exported as a reproducible batch build. Use the summary below to track each generated package.",
      });
      trackStudioEvent("export_succeeded", {
        buildType: "batch-family",
        variantCount: selectedBatchVariantIds.length,
        themeId: selectedThemePack?.id ?? "none",
      });
    } catch (error) {
      clearLastBatchExport();
      appendBuildHistory({
        id: `${Date.now()}-batch-failed`,
        timestamp: new Date().toISOString(),
        label: "Batch variant build",
        success: false,
        target: `${selectedTemplate.id} / ${selectedBatchVariantIds.length} variants / ${
          selectedThemePack?.id ?? "theme"
        }`,
        themeName: selectedThemePack?.name ?? null,
        fileName: null,
        objectUrl: null,
        manifestAvailable: false,
      });
      setFeedback({
        tone: "error",
        title: "Batch export failed",
        message:
          error instanceof Error
            ? error.message
            : "The selected course family variants could not be exported.",
      });
      trackStudioEvent("export_failed", {
        buildType: "batch-family",
        variantCount: selectedBatchVariantIds.length,
        themeId: selectedThemePack?.id ?? "none",
      });
    } finally {
      setIsBatchExporting(false);
    }
  }

  async function handleBuildAllProjectVariants(): Promise<void> {
    if (!selectedProject) {
      return;
    }

    setIsBatchExporting(true);
    setActiveStudioSurface("export");
    trackStudioEvent("export_attempted", {
      buildType: "project-matrix",
      projectId: selectedProject.id,
      exportMode,
    });

    try {
      const bundle = await exportCourseProjectBuildMatrix(selectedProject, {
        mode: exportMode,
        validationCatalog,
        moduleLibrary,
      });
      const objectUrl = window.URL.createObjectURL(bundle.blob);
      const historyObjectUrl = window.URL.createObjectURL(bundle.blob);

      clearLastBatchExport();
      batchExportObjectUrlRef.current = objectUrl;
      setLastBatchExport({
        fileName: bundle.fileName,
        objectUrl,
        summary: bundle.summary,
      });
      appendBuildHistory({
        id: `${Date.now()}-${bundle.fileName}`,
        timestamp: new Date().toISOString(),
        label: "Project build matrix",
        success: true,
        target: `${selectedProject.id} / ${bundle.summary.length} builds`,
        themeName: null,
        fileName: bundle.fileName,
        objectUrl: historyObjectUrl,
        manifestAvailable: true,
      });
      downloadPackage(bundle.fileName, objectUrl);

      setFeedback({
        tone: "success",
        title: "Project build matrix generated",
        message:
          "All valid template, variant, and theme combinations in the selected source project were built into a reproducible batch export.",
      });
      trackStudioEvent("export_succeeded", {
        buildType: "project-matrix",
        buildCount: bundle.summary.length,
        projectId: selectedProject.id,
      });
    } catch (error) {
      clearLastBatchExport();
      appendBuildHistory({
        id: `${Date.now()}-matrix-failed`,
        timestamp: new Date().toISOString(),
        label: "Project build matrix",
        success: false,
        target: `${selectedProject.id} / build matrix`,
        themeName: null,
        fileName: null,
        objectUrl: null,
        manifestAvailable: false,
      });
      setFeedback({
        tone: "error",
        title: "Project build matrix failed",
        message:
          error instanceof Error
            ? error.message
            : "The selected source project could not be built across all variants and themes.",
      });
      trackStudioEvent("export_failed", {
        buildType: "project-matrix",
        projectId: selectedProject.id,
      });
    } finally {
      setIsBatchExporting(false);
    }
  }

  const walkthroughSteps = [
    {
      targetRef: setupStepButtonRef,
      title: "Start with setup.",
      description:
        "Choose a course project, then select the template, saved version, and theme you want to work on.",
    },
    {
      targetRef: editStepButtonRef,
      title: "Edit in the right mode.",
      description:
        "Use Guided Editor for the easiest path, or switch to Source Editor when you want direct control of the course source.",
    },
    {
      targetRef: previewStepButtonRef,
      title: "Preview the learner experience.",
      description:
        "Run through the course in the browser and check the current step, score, and completion status before export.",
    },
    {
      targetRef: exportStepButtonRef,
      title: "Export for delivery.",
      description:
        "Generate a SCORM 1.2 zip, inspect the package contents, and use validation tools when you need LMS troubleshooting.",
    },
  ];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [activeStudioStep]);

  return (
    <main className="page-shell" data-studio-step={activeStudioStep} ref={studioRootRef}>
      <div className="studio-route-slot sr-only">{children}</div>
      {activeStudioStep === "setup" ? (
        <>
      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">{BRAND.studioName}</p>
          <h1>Build branching training without rebuilding slides.</h1>
          <p className="hero-subheadline">
            Choose a starter template, edit the scenario in guided forms, preview
            the learner experience, and export SCORM when it is ready.
          </p>
          <WorkflowSteps steps={["Choose", "Edit", "Preview", "Export", "Test"]} />
          <p className="hero-copy">
            Guided Editor is the default path for most instructional designers.
            Source Editor stays available when you want it, but YAML is optional.
          </p>
        </div>
        <div className="hero-summary">
          <div className="summary-card">
            <strong>Starter template</strong>
            <span>Begin with a ready-made scenario instead of a blank canvas.</span>
          </div>
          <div className="summary-card">
            <strong>Learner preview</strong>
            <span>Check the learner experience before you export.</span>
          </div>
          <div className="summary-card">
            <strong>SCORM export</strong>
            <span>Generate a SCORM package from the same source.</span>
          </div>
        </div>
      </section>

      <section className="panel beta-notice-panel">
        <div>
          <p className="eyebrow">Beta Feedback</p>
          <h2>Help improve the first-run workflow.</h2>
          <p className="panel-copy">
            {BRAND.productName} is currently in beta. Feedback helps improve the
            system.
          </p>
        </div>
        <p className="panel-copy">
          Use the feedback button in the corner to report bugs, confusion, or
          workflow issues with the current project, template, variant, and theme
          attached automatically.
        </p>
      </section>
        </>
      ) : (
        <section className="panel studio-step-intro-panel">
          <p className="eyebrow">{BRAND.studioName}</p>
          <h1>{currentStudioStepCopy.label}</h1>
          <p className="panel-copy">
            {currentStudioStepCopy.description}
          </p>
          <p className="panel-copy">
            Use the step navigation below to move through the workflow without
            losing your current draft.
          </p>
        </section>
      )}

      {!onboardingState.startHereDismissed ? (
        <section className="panel onboarding-panel" hidden={activeStudioStep !== "setup"} ref={startHerePanelRef}>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Start Here</p>
              <h2>What do you want to build?</h2>
              <p className="panel-copy">
                Start with a ready-made training scenario, make changes in Guided
                Editor, preview the learner experience, and then export SCORM.
                Source Editor is available any time, but most teams will not need it
                to get started.
              </p>
              {selectedStartingPath ? (
                <p className="panel-copy">
                  Recommended path: <strong>{selectedStartingPath.title}</strong>.{" "}
                  {selectedStartingPath.emphasis}
                </p>
              ) : null}
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                onClick={() => handleChooseStartingPath("beginner")}
                type="button"
              >
                Start from a template
              </button>
              <button
                className="ghost-button"
                onClick={() => handleChooseStartingPath("intermediate")}
                type="button"
              >
                Continue starter project
              </button>
              <button
                className="ghost-button"
                onClick={() => handleChooseStartingPath("advanced")}
                type="button"
              >
                Open Source Editor (optional)
              </button>
              <button
                className="ghost-button"
                onClick={() => projectSourceFileInputRef.current?.click()}
                type="button"
              >
                Import a course project
              </button>
              <button
                className="ghost-button"
                onClick={openFirstModuleGuide}
                type="button"
              >
                Build your first scenario
              </button>
              {selectedProject ? (
                <button
                  className="ghost-button"
                  onClick={() => void handleExportProjectSource()}
                  type="button"
                >
                  Download starter project
                </button>
              ) : null}
              <button
                className="ghost-button"
                onClick={handleDismissStartHerePanel}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="validation-state-grid onboarding-concepts">
            <HelpHint
              label="Scenario setup"
              description="This is where you update the lesson title, steps, and choices before preview and export."
            />
            <HelpHint
              label="Guided Editor"
              description="A guided form that edits the course for you without making you write YAML."
            />
            <HelpHint
              label="Starter template"
              description="A reusable starting point you can adapt quickly."
            />
            <HelpHint
              label="Saved version"
              description="One saved version of the lesson for a client, audience, or team."
            />
            <HelpHint
              label="Theme"
              description="The visual style for the course, such as colors, type, and logo."
            />
            <HelpHint
              label="Learner preview"
              description="A live preview of what learners will see."
            />
            <HelpHint
              label="SCORM export"
              description="The SCORM package created from your course source and theme."
            />
            <HelpHint
              label="SCORM package"
              description="The zip file you upload to SCORM Cloud or your LMS."
            />
          </div>

          <div className="preflight-check-grid onboarding-path-grid">
            {STUDIO_STARTING_PATHS.map((path) => (
              <article className="runtime-status-card" key={path.id}>
                <span className="runtime-status-label">{path.label} path</span>
                <strong>{path.title}</strong>
                <p className="panel-copy">{path.description}</p>
                <p className="panel-copy">{path.emphasis}</p>
                <button
                  className="ghost-button"
                  onClick={() => handleChooseStartingPath(path.id)}
                  type="button"
                >
                  {path.actionLabel}
                </button>
              </article>
            ))}
          </div>

          <div className="panel-subsection">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">5-minute first build</p>
                <p className="panel-copy section-copy">
                  Build your first scenario in four short steps: pick a starter,
                  rename the lesson, edit one decision point, then preview and export.
                </p>
              </div>
              <div className="button-row">
                <button
                  className="primary-button"
                  onClick={() => navigateToStudioStep("edit")}
                  type="button"
                >
                  Open Guided Editor
                </button>
                <button
                  className="ghost-button"
                  onClick={handleResetBuilderToTemplateDefaults}
                  type="button"
                >
                  Reset builder to template defaults
                </button>
                <button
                  className="ghost-button"
                  onClick={handleResetVariablesToDefaults}
                  type="button"
                >
                  Reset variables to defaults
                </button>
                <button
                  className="ghost-button"
                  onClick={handleResetDemo}
                  type="button"
                >
                  Reload starter example
                </button>
              </div>
            </div>
            <div className="preflight-check-grid">
              {firstModuleChecklist.map((item) => (
                <article className="runtime-status-card" key={item.id}>
                  <span className="runtime-status-label">
                    {item.complete ? "Done" : "Next step"}
                  </span>
                  <strong>{item.label}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="panel-subsection">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Why this is easier than slide tools</p>
                <p className="panel-copy section-copy">
                  Sapio Forge keeps one training flow, one learner preview, and one
                  export path instead of making you rebuild the same branching screens.
                </p>
              </div>
            </div>
            <div className="preflight-check-grid">
              <article className="runtime-status-card">
                <span className="runtime-status-label">One flow</span>
                <strong>No duplicated slide branches</strong>
                <p className="panel-copy">
                  Update one training flow instead of copying the same decision tree
                  across multiple slide versions.
                </p>
              </article>
              <article className="runtime-status-card">
                <span className="runtime-status-label">Preview first</span>
                <strong>Check the learner experience before export</strong>
                <p className="panel-copy">
                  Preview and validation happen before packaging SCORM, so issues show
                  up earlier.
                </p>
              </article>
              <article className="runtime-status-card">
                <span className="runtime-status-label">Reuse</span>
                <strong>Update repeated content once</strong>
                <p className="panel-copy">
                  Shared modules let teams reuse notices, decisions, and supporting
                  content instead of rebuilding screens by hand.
                </p>
              </article>
            </div>
          </div>

          <div className="panel-subsection">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Examples by skill level</p>
                <p className="panel-copy section-copy">
                  Pick a shipped example that matches how comfortable you are with
                  structured authoring.
                </p>
              </div>
            </div>
            <div className="preflight-check-grid onboarding-example-grid">
              {beginnerExamples.map((example) => (
                <article className="runtime-status-card" key={example.id}>
                  <span className="runtime-status-label">Beginner example</span>
                  <strong>{example.title}</strong>
                  <p className="panel-copy">{example.description}</p>
                  <button
                    className="ghost-button"
                    onClick={() => handleOpenStarterExample(example.id)}
                    type="button"
                  >
                    Open example
                  </button>
                </article>
              ))}
              {advancedExamples.map((example) => (
                <article className="runtime-status-card" key={example.id}>
                  <span className="runtime-status-label">Technical example</span>
                  <strong>{example.title}</strong>
                  <p className="panel-copy">{example.description}</p>
                  <button
                    className="ghost-button"
                    onClick={() => handleOpenStarterExample(example.id)}
                    type="button"
                  >
                    Open example
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="preflight-check-grid">
            <article className="runtime-status-card">
              <span className="runtime-status-label">Use Guided Editor when</span>
              <strong>You want the fastest first course</strong>
              <p className="panel-copy">
                Guided Editor is the best path for quick course creation, form-based
                editing, and a first SCORM export without managing project files.
              </p>
            </article>
            <article className="runtime-status-card">
              <span className="runtime-status-label">Use the starter repo when</span>
              <strong>You want source-controlled team workflows</strong>
              <p className="panel-copy">
                Course projects are better when your team wants templates, themes,
                CI builds, and Git review around repeatable course families.
              </p>
            </article>
          </div>

          <div className="validation-state-grid">
            <span className="status-pill">Use Guided Editor for quick course creation</span>
            <span className="status-pill">Use the starter repo for source-controlled team workflows</span>
            <span className="status-pill">Source stays editable; SCORM stays generated</span>
          </div>
        </section>
      ) : null}

      <section className="panel studio-step-nav-panel">
        <div>
          <p className="eyebrow">Studio Steps</p>
          <h2>{"Template -> Edit -> Preview -> Export"}</h2>
          <p className="panel-copy">
            Move through the same Studio step by step: choose a starter, edit the
            scenario, preview the learner experience, and export when it is ready.
          </p>
        </div>
        <div className="studio-step-nav-grid">
          {STUDIO_STEP_COPY.map((step) => {
            const isActive = activeStudioStep === step.id;
            const ref =
              step.id === "setup"
                ? setupStepButtonRef
                : step.id === "edit"
                  ? editStepButtonRef
                  : step.id === "preview"
                    ? previewStepButtonRef
                    : step.id === "export"
                      ? exportStepButtonRef
                      : advancedStepButtonRef;

            return (
              <button
                key={step.id}
                aria-current={isActive ? "page" : undefined}
                className={`studio-step-button ${isActive ? "studio-step-button-active" : ""}`}
                onClick={() => navigateToStudioStep(step.id)}
                ref={ref}
                type="button"
              >
                <span className="studio-step-number">{step.step}</span>
                <span className="studio-step-copy">
                  <strong>{step.label}</strong>
                  <span>{step.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {feedback ? (
        <div className={`feedback-banner feedback-${feedback.tone}`}>
          <strong>{feedback.title}</strong>
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="workbench-grid workbench-grid-single-step" key={activeStudioStep}>
        <div className="panel editor-panel" hidden={activeStudioStep === "preview"}>
          <div className="panel-section" hidden={activeStudioStep !== "setup"} ref={templateSelectorRef}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">
                  {availableProjects.length > 0 ? "Starter templates" : "Template packs"}
                </p>
                <div className="help-inline-row">
                  <p className="panel-copy section-copy">
                    Choose the kind of training you want to build first.
                  </p>
                  <HelpHint
                    label="Starter lesson"
                    description="Choose a starter lesson here, then edit it, preview it, and export it."
                  />
                </div>
                <p className="panel-copy section-copy">
                  {availableProjects.length > 0
                    ? "Choose a ready-made training scenario, then pick the saved version and theme that fit your audience. Every starter opens directly in Guided Editor."
                    : "Choose a starter template, then adjust the saved details that personalize the lesson."}
                </p>
              </div>
              <div className="button-row">
                <input
                  accept=".zip"
                  className="file-input"
                  onChange={(event) => void handleImportProjectSource(event)}
                  ref={projectSourceFileInputRef}
                  type="file"
                />
                <button
                  className="ghost-button"
                  onClick={() => projectSourceFileInputRef.current?.click()}
                  type="button"
                >
                  Import Project Source
                </button>
                {selectedProject ? (
                  <button
                    className="ghost-button"
                    onClick={() => void handleExportProjectSource()}
                    type="button"
                  >
                    Export Project Source
                  </button>
                ) : null}
                <button
                  className="ghost-button"
                  onClick={handleResetDemo}
                  type="button"
                >
                  Reset Demo
                </button>
              </div>
            </div>
            <div className="template-grid">
              {availablePacks.map((pack) => (
                <button
                  className={`template-card ${
                    activePackId === pack.id ? "template-card-active" : ""
                  }`}
                  aria-pressed={activePackId === pack.id}
                  key={pack.id}
                  onClick={() => handleSelectPack(pack)}
                  type="button"
                >
                  <div className="template-card-header">
                    <span className="template-pill">
                      {activePackId === pack.id ? "Selected starter" : "Starter template"}
                    </span>
                    <span className="scenario-pill">
                      {selectedProject?.id === pack.id ? "Ready to edit" : "Use case"}
                    </span>
                  </div>
                  <strong>{pack.title}</strong>
                  <span>{pack.description}</span>
                  <span className="template-card-meta">
                    {pack.templates.length} template
                    {pack.templates.length === 1 ? "" : "s"} |{" "}
                    {pack.templates.reduce(
                      (count, template) => count + template.variants.length,
                      0
                    )}{" "}
                    variants
                  </span>
                  <span className="template-card-cta">Start with this template</span>
                </button>
              ))}
            </div>

            {selectedPack ? (
              <div className="template-pack-stack">
                <div className="runtime-status-grid inspector-grid">
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">
                      {selectedProject ? "Project id" : "Category"}
                    </span>
                    <strong>{selectedProject?.id ?? selectedPack.category}</strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">
                      {selectedProject ? "Version" : "Use case"}
                    </span>
                    <strong>
                      {selectedProject?.version ?? selectedPack.recommendedUseCase}
                    </strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">Templates</span>
                    <strong>{selectedPack.templates.length}</strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">
                      {selectedProject ? "Themes" : "Variants"}
                    </span>
                    <strong>
                      {selectedProject
                        ? selectedProject.themes.length
                        : selectedPack.templates.reduce(
                            (count, template) => count + template.variants.length,
                            0
                          )}
                    </strong>
                  </div>
                </div>

                {selectedProject ? (
                  <div className="preflight-check-grid">
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Source project</span>
                      <strong>{selectedProject.title}</strong>
                      <p className="panel-copy">
                        Version-controlled source files stay authoritative. Templates,
                        variable sets, and themes are composed here before preview and export.
                      </p>
                    </article>
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Build targets</span>
                      <strong>{selectedProject.buildTargets.join(", ")}</strong>
                      <p className="panel-copy">
                        Source files: {selectedProject.sourceFiles.length} | Assets:{" "}
                        {selectedProject.binaryFiles.length}
                      </p>
                    </article>
                    {selectedProject.validation.checks.map((check) => (
                      <article className="runtime-status-card" key={check.id}>
                        <span className="runtime-status-label">{check.label}</span>
                        <strong>{check.passed ? "Passed" : "Needs attention"}</strong>
                        <p className="panel-copy">{check.details}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className="panel-subsection">
                  <div className="section-heading-row">
                    <div>
                      <p className="eyebrow">
                        {selectedProject ? "Project Templates" : "Shared Templates"}
                      </p>
                      <p className="panel-copy section-copy">
                        {selectedProject
                          ? "Each starter template creates a real training scenario you can edit right away."
                          : "Each template creates a reusable lesson you can adapt quickly for a new audience."}
                      </p>
                    </div>
                  </div>
                  <div className="template-grid">
                    {availableTemplates.map((template) => (
                      <button
                        className={`template-card ${
                          activeTemplateId === template.id
                            ? "template-card-active"
                            : ""
                        }`}
                        aria-pressed={activeTemplateId === template.id}
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        type="button"
                      >
                        <div className="template-card-header">
                          <span className="template-pill">
                            {activeTemplateId === template.id
                              ? "Selected scenario"
                              : "Starter scenario"}
                          </span>
                          <span className="scenario-pill">
                            {template.variants.length} variants
                          </span>
                        </div>
                        <strong>{template.title}</strong>
                        <span>{template.description}</span>
                        <span className="template-card-meta">
                          {template.recommendedUseCase}
                        </span>
                        <span className="template-card-cta">Start with this template</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTemplate ? (
                  <div className="panel-subsection">
                    <div className="section-heading-row">
                      <div>
                        <p className="eyebrow">Course details</p>
                        <p className="panel-copy section-copy">
                          Pick the saved version that best matches the audience or
                          client you are building for.
                        </p>
                      </div>
                    </div>
                    <div className="template-grid">
                      {selectedTemplate.variants.map((variant) => (
                        <button
                          className={`template-card ${
                            activeVariantId === variant.id
                              ? "template-card-active"
                              : ""
                          }`}
                          aria-pressed={activeVariantId === variant.id}
                          key={variant.id}
                          onClick={() => handleSelectVariant(variant)}
                          type="button"
                        >
                          <div className="template-card-header">
                            <span className="template-pill">
                              {activeVariantId === variant.id
                                ? "Selected variant"
                                : "Variable set"}
                            </span>
                            <span className="scenario-pill">{variant.id}</span>
                          </div>
                          <strong>{variant.title}</strong>
                          <span>{variant.description}</span>
                          {variant.notes ? (
                            <span className="template-card-meta">{variant.notes}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="panel-section" hidden={activeStudioStep !== "setup"}>
            <p className="eyebrow">Course details</p>
            <div className="help-inline-row">
              <h2>Rename the lesson and company values</h2>
              <HelpHint
                label="Variant"
                description="A variant is one saved set of template values that generates a specific course version."
              />
            </div>
            <p className="panel-copy section-copy">
              Update the lesson title, company, and other details here. Guided
              fields personalize the scenario without changing the main flow.
            </p>
            <p className="editing-surface-note">{variableSurfaceSummary.description}</p>
            {selectedTemplate ? (
              <div className="validation-state-grid">
                <span className="status-pill">{selectedTemplate.title}</span>
                <span className="status-pill">
                  {selectedTemplate.variants.length} saved variable sets
                </span>
                <span className="status-pill">
                  {Object.keys(selectedTemplate.variableSchema.variables).length} declared
                  variables
                </span>
              </div>
            ) : null}
            <div className="template-data-meta-grid">
              <label className="template-field">
                <span className="template-field-label">Variant title</span>
                <span className="template-field-description">
                  Local metadata for this compiled variant. Duplicate a variable set,
                  then rename it here before exporting.
                </span>
                <input
                  className="template-field-input"
                  onChange={(event) => {
                    setVariantDraftTitle(event.target.value);
                    if (activeVariantId) {
                      setActiveVariantId(null);
                    }
                    setSourceLabel(`Local variant: ${event.target.value || "Untitled variant"}`);
                  }}
                  type="text"
                  value={variantDraftTitle}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Variant id</span>
                <span className="template-field-description">
                  Use this for the variable-set filename and batch-build summary.
                </span>
                <input
                  className="template-field-input"
                  onChange={(event) => {
                    setVariantDraftId(event.target.value);
                    if (activeVariantId) {
                      setActiveVariantId(null);
                    }
                  }}
                  type="text"
                  value={variantDraftId}
                />
              </label>
            </div>
            <TemplateDataEditor
              fields={templateFields}
              onChange={handleTemplateDataChange}
              values={templateDataValues}
            />
          </div>

          <div className="panel-section" hidden={activeStudioStep !== "setup"}>
            <p className="eyebrow">Visual theme</p>
            <div className="help-inline-row">
              <h2>Choose how the lesson looks</h2>
              <HelpHint
                label="Theme"
                description="A theme pack changes presentation tokens like color, typography, and logo without changing course structure."
              />
            </div>
            <p className="panel-copy section-copy">
              Choose the colors, logo, and visual style for the lesson. This changes
              the look of the course, not the training flow.
            </p>
            <p className="editing-surface-note">{themeSurfaceSummary.description}</p>
            <div className="validation-state-grid">
              <span className="status-pill">Lesson flow stays the same</span>
              <span className="status-pill">Theme changes the look</span>
              <span className="status-pill">SCORM export uses this theme</span>
            </div>
            <div className="template-grid">
              {themePacks.map((themePack) => (
                <button
                  className={`template-card ${
                    selectedThemePack?.id === themePack.id
                      ? "template-card-active"
                      : ""
                  }`}
                  aria-pressed={selectedThemePack?.id === themePack.id}
                  key={themePack.id}
                  onClick={() => handleSelectThemePack(themePack)}
                  type="button"
                >
                  <div className="template-card-header">
                    <span className="template-pill">
                      {selectedThemePack?.id === themePack.id
                        ? "Active theme"
                        : "Theme pack"}
                    </span>
                    <span className="scenario-pill">{themePack.version}</span>
                  </div>
                  <strong>{themePack.name}</strong>
                  <span>{themePack.description}</span>
                  <span className="template-card-meta">
                    {themePack.author} | {themePack.supportedLayouts.length} layouts
                  </span>
                </button>
              ))}
            </div>
            {selectedThemePack ? (
              <div className="theme-pack-grid">
                <article className="runtime-status-card">
                  <span className="runtime-status-label">Theme pack</span>
                  {selectedThemePack.logoPreviewUrl ? (
                    <img
                      alt={`${selectedThemePack.name} logo`}
                      className="runtime-logo"
                      src={selectedThemePack.logoPreviewUrl}
                    />
                  ) : null}
                  <strong>{selectedThemePack.name}</strong>
                  <p className="panel-copy">
                    {selectedThemePack.description}
                  </p>
                </article>
                <article className="runtime-status-card">
                  <span className="runtime-status-label">Author</span>
                  <strong>{selectedThemePack.author}</strong>
                  <p className="panel-copy">
                    Version {selectedThemePack.version} | Runtime{" "}
                    {selectedThemePack.runtimeCompatibility}
                  </p>
                </article>
                <article className="runtime-status-card">
                  <span className="runtime-status-label">Bundled assets</span>
                  <strong>{selectedThemePack.bundleFiles.length}</strong>
                  <p className="panel-copy">
                    {selectedThemePack.logoBundlePath
                      ? "Logo and any declared font assets are packaged with export builds."
                      : "This theme relies on tokens only and does not bundle a logo asset."}
                  </p>
                </article>
              </div>
            ) : null}
            {selectedThemePack ? (
              <div className="preflight-check-grid">
                {buildThemeTokenSummary(
                  applyThemePackToCourse(
                    compiledSnapshot.previewModel ?? defaultPipelineSnapshot.previewModel!,
                    selectedThemePack,
                    {
                      assetMode: "preview",
                    }
                  ).theme
                ).map((token) => (
                  <article className="runtime-status-card" key={token.label}>
                    <span className="runtime-status-label">{token.label}</span>
                    <strong>{token.value}</strong>
                    <p className="panel-copy">
                      Applied to the compiled preview and export runtime.
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <section className="panel repeatable-workflow-panel" hidden={activeStudioStep !== "edit"}>
            <p className="eyebrow">Built for Repeatable Workflows</p>
            <h2>Create one course structure, then reuse it</h2>
            <p className="panel-copy">
              Shared template source plus variable sets remain the system of record.
              Compiled course variants and SCORM packages are build outputs that can
              be regenerated consistently from Git-tracked source files.
            </p>
            <div className="trust-grid">
              <span className="trust-pill">Shared template source</span>
              <span className="trust-pill">Schema-validated variables</span>
              <span className="trust-pill">Git-friendly YAML</span>
              <span className="trust-pill">Repeatable SCORM builds</span>
            </div>
          </section>

          <div className="panel-header" hidden={activeStudioStep !== "edit"}>
            <div>
              <p className="eyebrow">Authoring Workflow</p>
              <div className="help-inline-row">
                <h2>
                  {authoringMode === "builder"
                    ? "Guided Editor"
                    : "Source Editor"}
                </h2>
                <HelpHint
                  label={authoringMode === "builder" ? "Guided Editor" : "Source Editor"}
                  description={authoringSurfaceSummary.description}
                />
              </div>
              <p className="panel-copy">
                {authoringMode === "builder"
                  ? "Use guided fields to update the current lesson. Guided and Source editing both lead to the same learner preview and SCORM export."
                  : "Use Source Editor when you want direct YAML control. It is optional, and it leads to the same learner preview and SCORM export as Guided Editor."}
              </p>
              <p className="editing-surface-note">{authoringSurfaceSummary.label}</p>
              <button
                className="inline-link-button"
                onClick={openAuthoringGuide}
                type="button"
              >
                Authoring guide
              </button>
              <button
                className="inline-link-button"
                onClick={openFirstModuleGuide}
                type="button"
              >
                Build your first module
              </button>
            </div>
            <div className="button-row">
              <input
                accept=".yaml,.yml,text/yaml,text/plain"
                className="file-input"
                onChange={(event) => void handleUpload(event)}
                ref={fileInputRef}
                type="file"
              />
              <input
                accept=".yaml,.yml,text/yaml,text/plain"
                className="file-input"
                onChange={(event) => void handleTemplateDataUpload(event)}
                ref={templateDataFileInputRef}
                type="file"
              />
              <button
                className={authoringMode === "builder" ? "primary-button toggle-button-active" : "ghost-button"}
                onClick={() => setAuthoringMode("builder")}
                type="button"
              >
                Guided Editor
              </button>
              <button
                className={`ghost-button ${authoringMode === "source" ? "toggle-button-active" : ""}`}
                onClick={() => setAuthoringMode("source")}
                type="button"
              >
                Source Editor (optional)
              </button>
              <button
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload course source
              </button>
              <button
                className="ghost-button"
                onClick={() => templateDataFileInputRef.current?.click()}
                type="button"
              >
                Import variable set
              </button>
              <button
                className="ghost-button"
                disabled={!selectedTemplate}
                onClick={handleDownloadTemplateSource}
                type="button"
              >
                Download template source
              </button>
              <button
                className="ghost-button"
                onClick={handleDownloadSourceYaml}
                type="button"
              >
                Download course source
              </button>
              <button
                className="ghost-button"
                onClick={handleDownloadTemplateData}
                type="button"
              >
                Download variable set
              </button>
              <button
                className="ghost-button"
                onClick={handleDownloadSourceReadme}
                type="button"
              >
                Download source README
              </button>
              <button
                className="ghost-button"
                disabled={!selectedTemplate}
                onClick={handleDuplicateVariant}
                type="button"
              >
                Duplicate as new variant
              </button>
              <button
                className="ghost-button"
                disabled={!selectedTemplate}
                onClick={handleResetBuilderToTemplateDefaults}
                type="button"
              >
                Reset builder to template defaults
              </button>
              <button
                className="ghost-button"
                disabled={!selectedTemplate}
                onClick={handleResetVariablesToDefaults}
                type="button"
              >
                Reset variables to defaults
              </button>
              <button
                className="ghost-button"
                onClick={handleSyncBuilderFromSource}
                type="button"
              >
                Sync builder from source
              </button>
              <button className="primary-button" onClick={handleCompile} type="button">
                {isPending ? "Updating preview..." : "Update preview"}
              </button>
            </div>
          </div>

          <details
            className="details-panel"
            hidden={activeStudioStep !== "edit"}
            id="first-module-guide"
            onToggle={(event) => setIsFirstModuleGuideOpen(event.currentTarget.open)}
            open={isFirstModuleGuideOpen}
            ref={firstModuleGuideRef}
          >
            <summary>Build your first module</summary>
            <div className="details-copy">
              <ol className="guide-bullet-list ordered-guide-list">
                <li>
                  Start with <strong>Start in Guided Editor</strong> to load the
                  simplest starter project.
                </li>
                <li>
                  Edit the title, content, or choices in Guided Editor. If you want
                  to inspect the YAML, switch to <strong>Source Editor</strong>.
                </li>
                <li>
                  Click <strong>Update preview</strong> and use the learner preview
                  to verify the learner flow.
                </li>
                <li>
                  Click <strong>Export SCORM 1.2</strong> or a validation build, then
                  inspect the package contents.
                </li>
                <li>
                  Test the package in SCORM Cloud first, then in your LMS if needed.
                </li>
              </ol>
              <div className="preflight-check-grid">
                <article className="runtime-status-card">
                  <span className="runtime-status-label">Beginner example</span>
                  <strong>Customer service starter</strong>
                  <p className="panel-copy">
                    Fastest path to a first successful preview and export.
                  </p>
                </article>
                <article className="runtime-status-card">
                  <span className="runtime-status-label">Technical example</span>
                  <strong>Security awareness project</strong>
                  <p className="panel-copy">
                    Best when you want to inspect source, variants, themes, and build
                    artifacts directly.
                  </p>
                </article>
              </div>
            </div>
          </details>

          <details
            className="details-panel"
            hidden={activeStudioStep !== "edit"}
            id="authoring-guide"
            onToggle={(event) => setIsAuthoringGuideOpen(event.currentTarget.open)}
            open={isAuthoringGuideOpen}
            ref={authoringGuideRef}
          >
            <summary>Authoring guide</summary>
            <div className="details-copy">
              <p className="panel-copy">
                Guided Editor and Source Editor both produce the same structured
                course definition. Start with top-level course details, add steps in
                order, and use branching targets like <code>next</code>, <code>passNext</code>,
                and <code>failNext</code> to move through the scenario.
              </p>
              <pre className="json-preview guide-code-block">
{`id: example-course
title: Example Scenario
start: intro
passingScore: 10
nodes:
  - id: intro
    type: content
    title: Welcome
    body: Introduce the learner.
    next: decision

  - id: decision
    type: choice
    title: First branch
    options:
      - id: safe
        label: Choose the safe action
        score: 5
        next: quiz

  - id: quiz
    type: quiz
    title: Knowledge check
    question: What happens next?
    correctScore: 5
    passNext: passed
    failNext: failed`}
              </pre>
              <ul className="guide-bullet-list">
                <li>
                  <strong>Guided and Source editing:</strong> Guided Editor is a
                  form-based layer that writes structured YAML internally. Switch to
                  Source Editor (optional) any time to review or edit the underlying definition.
                </li>
                <li>
                  <strong>Node types:</strong> Use <code>content</code> for
                  context, <code>choice</code> or <code>branch</code> for
                  branching, <code>question</code> or <code>quiz</code> for scored
                  knowledge checks, and <code>result</code> for the end screen.
                </li>
                <li>
                  <strong>Branching:</strong> Choice options use <code>next</code>{" "}
                  and quiz nodes can use <code>passNext</code>,{" "}
                  <code>failNext</code>, or <code>next</code>.
                </li>
                <li>
                  <strong>Scoring:</strong> Choice options can add points with{" "}
                  <code>score</code>; quiz nodes use <code>correctScore</code> and{" "}
                  <code>incorrectScore</code>.
                </li>
                <li>
                  <strong>Layouts:</strong> Each node can opt into a reusable
                  layout primitive such as <code>text</code>, <code>image-right</code>,
                  <code>two-column</code>, <code>quote</code>, or <code>result</code>.
                </li>
                <li>
                  <strong>Theme packs:</strong> Branding is applied separately from
                  source via reusable theme packs, so the same course family can be
                  exported with different organization styles without changing the
                  branching definition.
                </li>
              </ul>
            </div>
          </details>

          <div className="source-row" hidden={activeStudioStep !== "edit"}>
            <span className="status-pill">{sourceLabel}</span>
            <span
              className={`status-pill ${
                hasUncompiledChanges ? "status-warn" : "status-ready"
              }`}
            >
              {hasUncompiledChanges
                ? "Draft source changed since the last compiled build"
                : "Learner preview is in sync with validated source"}
            </span>
          </div>

          {authoringMode === "builder" ? (
            <div hidden={activeStudioStep !== "edit"} ref={yamlEditorRef}>
              <CourseBuilder
                course={builderDraft}
                compiledCourse={activeSnapshot.canonicalCourse}
                onChange={applyBuilderCourse}
                validationErrors={displayedValidationErrors}
              />
            </div>
          ) : (
            <div hidden={activeStudioStep !== "edit"} ref={yamlEditorRef}>
              <YamlEditor
                onChange={handleYamlChange}
                placeholder="Paste course YAML here..."
                value={draftYaml}
              />
            </div>
          )}

          {feedback ? (
            <div className={`feedback-banner feedback-${feedback.tone}`} hidden={activeStudioStep !== "edit"}>
              <strong>{feedback.title}</strong>
              <span>{feedback.message}</span>
            </div>
          ) : null}

          {displayedValidationErrors.length > 0 ? (
            <div className="error-panel" hidden={activeStudioStep !== "edit"}>
              <h3>
                {authoringMode === "builder"
                  ? "Builder issues to fix"
                  : "Source issues to fix"}
              </h3>
              <p className="panel-copy">
                These messages update from the current draft and are tied to the
                active editing mode, so you can fix missing fields, broken paths,
                and missing values before you export.
              </p>
              <ValidationIssueList issues={displayedValidationErrors} />
            </div>
          ) : null}

          {activeSnapshot.warnings.length > 0 ? (
            <div className="error-panel" hidden={activeStudioStep !== "edit"}>
              <h3>Build warnings to review</h3>
              <p className="panel-copy">
                These warnings will not stop export, but they may still be worth fixing.
              </p>
              <ValidationIssueList issues={activeSnapshot.warnings} />
            </div>
          ) : null}

          <div className="export-bar" hidden={activeStudioStep !== "export"} ref={exportSectionRef}>
            <div>
              <p className="eyebrow">Export Build</p>
              <h3>Export your course as SCORM</h3>
              <p className="panel-copy">
                Choose a standard package for normal delivery or a validation build
                when you need extra diagnostics.
              </p>
              <p className="panel-copy">
                SCORM Cloud is the current validated baseline. Use the validation
                build when you want extra help testing in a real LMS.
              </p>
              <div className="validation-state-grid">
                {selectedProject ? (
                  <span className="status-pill">Project: {selectedProject.title}</span>
                ) : null}
                <span className="status-pill">
                  Template: {selectedTemplate?.title ?? "Custom source"}
                </span>
                <span className="status-pill">
                  Variant: {variantDraftTitle}
                </span>
                <span className="status-pill">
                  Theme: {selectedThemePack?.name ?? "None"}
                </span>
              </div>
              <div className="button-row">
                <button
                  className={`ghost-button ${
                    exportMode === "standard" ? "toggle-button-active" : ""
                  }`}
                  onClick={() => {
                    setExportMode("standard");
                    clearLastExportedPackage();
                    clearLastBatchExport();
                  }}
                  type="button"
                >
                  Standard SCORM 1.2
                </button>
                <button
                  className={`ghost-button ${
                    exportMode === "validation" ? "toggle-button-active" : ""
                  }`}
                  onClick={() => {
                    setExportMode("validation");
                    clearLastExportedPackage();
                    clearLastBatchExport();
                  }}
                  type="button"
                >
                  LMS Validation Build
                </button>
              </div>
              <p className="panel-copy">
                Selected mode:{" "}
                <strong>
                  {exportMode === "validation"
                    ? "Validation build with diagnostics on"
                    : "Standard SCORM package"}
                </strong>
              </p>
              {selectedProject ? (
                <label className="studio-toggle-row">
                  <input
                    checked={requirePassingTestsBeforeExport}
                    onChange={(event) =>
                      setRequirePassingTestsBeforeExport(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span>Run logic tests before export</span>
                </label>
              ) : null}
              {selectedProject ? (
                <p className="panel-copy">
                  Project source stays editable. The SCORM zip and build manifest
                  are generated output files.
                </p>
              ) : null}
              <Link className="inline-link-button" href="/validation">
                View proof center
              </Link>
            </div>
            <div className="button-row">
              {selectedProject ? (
                <button
                  className="ghost-button"
                  onClick={handleValidateProject}
                  type="button"
                >
                  Validate Project
                </button>
              ) : null}
              <button
                className="primary-button export-button"
                disabled={!isReadyToExport || isExporting}
                onClick={() => void handleExport()}
                ref={exportButtonRef}
                type="button"
              >
                {isExporting
                  ? "Building..."
                  : selectedProject
                    ? exportMode === "validation"
                      ? "Build Validation Project"
                      : "Build Project"
                    : exportMode === "validation"
                      ? "Export LMS Validation Build"
                      : "Export SCORM 1.2"}
              </button>
            </div>
          </div>

          {selectedTemplate && selectedTemplate.variants.length > 1 ? (
            <section className="panel export-result-panel" hidden={activeStudioStep !== "export"}>
              <div className="export-result-header">
                <div>
                  <p className="eyebrow">Batch Build</p>
                  <h3>Generate a repeatable course family build</h3>
                  <p className="panel-copy">
                    Export multiple variable sets from the same template as one
                    bundle. Each SCORM package stays reproducible and the build
                    summary records the exact variant and theme used.
                  </p>
                </div>
                <div className="button-row">
                  {selectedProject && selectedProject.themes.length > 1 ? (
                    <button
                      className="ghost-button"
                      disabled={isBatchExporting}
                      onClick={() => void handleBuildAllProjectVariants()}
                      type="button"
                    >
                      {isBatchExporting
                        ? "Building project..."
                        : "Build All Variants"}
                    </button>
                  ) : null}
                  <button
                    className="primary-button"
                    disabled={selectedBatchVariantIds.length === 0 || isBatchExporting}
                    onClick={() => void handleBatchExport()}
                    type="button"
                  >
                    {isBatchExporting
                      ? "Building family..."
                      : "Batch export selected variants"}
                  </button>
                </div>
              </div>
              <div className="batch-variant-grid">
                {selectedTemplate.variants.map((variant) => (
                  <label className="runtime-status-card batch-variant-card" key={variant.id}>
                    <span className="runtime-status-label">{variant.title}</span>
                    <strong>{variant.id}</strong>
                    <p className="panel-copy">{variant.description}</p>
                    <input
                      checked={selectedBatchVariantIds.includes(variant.id)}
                      onChange={(event) =>
                        setSelectedBatchVariantIds((currentValue) =>
                          event.target.checked
                            ? [...new Set([...currentValue, variant.id])]
                            : currentValue.filter((value) => value !== variant.id)
                        )
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>

              {lastBatchExport ? (
                <div className="package-contents-panel">
                  <div className="button-row">
                    <button
                      className="primary-button"
                      onClick={() =>
                        downloadPackage(
                          lastBatchExport.fileName,
                          lastBatchExport.objectUrl
                        )
                      }
                      type="button"
                    >
                      Download batch build
                    </button>
                  </div>
                  <p className="eyebrow">Build summary</p>
                  <div className="preflight-check-grid">
                    {lastBatchExport.summary.map((item) => (
                      <article className="runtime-status-card" key={item.outputFileName}>
                        <span className="runtime-status-label">
                          {item.templateId} / {item.variantId}
                        </span>
                        <strong>{item.courseTitle}</strong>
                        <p className="panel-copy">
                          {item.outputFileName} | {item.exportMode} |{" "}
                          {formatBuildTimestamp(item.builtAt)}
                          {item.themeName ? ` | ${item.themeName}` : ""}
                          {item.projectId ? ` | ${item.projectId}` : ""}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {lastExportedPackage ? (
            <section className="panel export-result-panel" hidden={activeStudioStep !== "export"}>
              <div className="export-result-header">
                <div>
                  <p className="eyebrow">Generated Package</p>
                  <h3>
                    {lastExportedPackage.metadata.exportMode === "validation"
                      ? "LMS validation build generated successfully."
                      : "SCORM 1.2 package generated successfully."}
                  </h3>
                  <p className="panel-copy">
                    Your package is ready. Download it now or review the files
                    inside before importing it into an LMS.
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={() =>
                      downloadPackage(
                        lastExportedPackage.fileName,
                        lastExportedPackage.objectUrl
                      )
                    }
                    type="button"
                  >
                    {lastExportedPackage.metadata.exportMode === "validation"
                      ? "Download LMS validation build"
                      : "Download SCORM package"}
                  </button>
                  <button
                    className="ghost-button"
                    onClick={handleDownloadValidationNotes}
                    type="button"
                  >
                    Download validation notes
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      setIsPackageViewerOpen((currentValue) => !currentValue)
                    }
                    type="button"
                  >
                    {isPackageViewerOpen
                      ? "Hide package contents"
                      : "View package contents"}
                  </button>
                </div>
              </div>

              {isPackageViewerOpen ? (
                <div className="package-contents-panel">
                  <div className="runtime-status-grid inspector-grid">
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Export mode</span>
                      <strong>{lastExportedPackage.metadata.exportMode}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Diagnostics</span>
                      <strong>
                        {lastExportedPackage.metadata.diagnosticsEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Source project</span>
                      <strong>{lastExportedPackage.metadata.projectId ?? "Custom source"}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Template</span>
                      <strong>{lastExportedPackage.metadata.templateId ?? "Custom source"}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Variant</span>
                      <strong>{lastExportedPackage.metadata.variantId ?? variantDraftId}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Course</span>
                      <strong>{lastExportedPackage.metadata.courseId}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Built at</span>
                      <strong>
                        {formatBuildTimestamp(lastExportedPackage.metadata.builtAt)}
                      </strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Theme pack</span>
                      <strong>
                        {lastExportedPackage.metadata.themeName ?? "Default runtime"}
                      </strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Theme version</span>
                      <strong>
                        {lastExportedPackage.metadata.themeVersion ?? "n/a"}
                      </strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Output file</span>
                      <strong>{lastExportedPackage.metadata.outputFileName}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Build fingerprint</span>
                      <strong>{lastExportedPackage.metadata.buildFingerprint}</strong>
                    </div>
                  </div>
                  <p className="eyebrow">Applied Theme Tokens</p>
                  <div className="preflight-check-grid">
                    {lastExportedPackage.metadata.themeTokens.map((token) => (
                      <article className="runtime-status-card" key={token.label}>
                        <span className="runtime-status-label">{token.label}</span>
                        <strong>{token.value}</strong>
                        <p className="panel-copy">
                          Resolved into the branded preview and SCORM runtime.
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="eyebrow">SCORM Package Contents</p>
                  <ul className="package-contents-list">
                    {lastExportedPackage.contents.map((filePath) => (
                      <li key={filePath}>{filePath}</li>
                    ))}
                  </ul>
                  <div className="export-test-notes">
                    <strong>Export test notes for {selectedValidationTarget?.name}</strong>
                    <p className="panel-copy">
                      Run the LMS checklist for import, launch, completion, score,
                      pass/fail, and resume. Validation builds include diagnostics to
                      help isolate API discovery or SCORM write failures quickly.
                    </p>
                    <pre className="json-preview validation-notes-preview">
                      {lastExportedPackage.validationNotes}
                    </pre>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <details className="details-panel" hidden={activeStudioStep !== "advanced"}>
            <summary>How reusable blocks work</summary>
            <div className="details-copy">
              <p className="panel-copy">
                Define root-level <code>blocks</code>, then inline them in{" "}
                <code>nodes</code> with <code>- include: block_name</code>.
                Placeholders like <code>{"{{courseTitle}}"}</code> resolve from{" "}
                <code>templateData</code> or a selected variable set during compilation.
              </p>
            </div>
          </details>

          {selectedPack ? (
            <details className="details-panel" hidden={activeStudioStep !== "advanced"}>
              <summary>
                {selectedProject ? "View source project notes" : "View template pack notes"}
              </summary>
              <pre className="json-preview">{selectedPack.readme}</pre>
            </details>
          ) : null}

          {selectedTemplate ? (
            <details className="details-panel" hidden={activeStudioStep !== "advanced"}>
              <summary>View template notes and variable schema</summary>
              <div className="details-copy">
                <pre className="json-preview">{selectedTemplate.readme}</pre>
                <pre className="json-preview">{selectedTemplate.schemaYaml}</pre>
              </div>
            </details>
          ) : null}

          <details className="details-panel" hidden={activeStudioStep !== "advanced"}>
            <summary>View resolved source document</summary>
            <pre className="json-preview">
              {activeSnapshot.expandedCourseJson ||
                "Compile the source to inspect the resolved document."}
            </pre>
          </details>

          <details className="details-panel" hidden={activeStudioStep !== "advanced"}>
            <summary>View canonical normalized model</summary>
            <pre className="json-preview">
              {activeSnapshot.compiledJson ||
                "Compile the source to inspect the normalized runtime graph."}
            </pre>
          </details>
        </div>

        <div className="preview-column" hidden={activeStudioStep === "setup" || activeStudioStep === "edit"}>
          <section className="panel preview-cta-panel" hidden={activeStudioStep !== "preview"}>
            <div>
              <p className="eyebrow">Learner Preview</p>
              <div className="help-inline-row">
                <h2>Review the learner experience before export</h2>
                <HelpHint
                  label="Learner preview"
                  description={previewSurfaceSummary.description}
                />
              </div>
              <p className="panel-copy">
                {isReadyToExport
                  ? "This learner preview is ready. When the lesson feels right, move to export."
                  : "Use this view to check what learners will see before you export SCORM."}
              </p>
              <p className="editing-surface-note">{previewSurfaceSummary.label}</p>
            </div>
            <div className="button-row">
              <button
                className="ghost-button"
                onClick={() => navigateToStudioStep("edit")}
                type="button"
              >
                Open edit step
              </button>
              <button
                className="primary-button export-button"
                onClick={() => navigateToStudioStep("export")}
                type="button"
              >
                Open export step
              </button>
              <button
                className="ghost-button"
                onClick={() => navigateToStudioStep("advanced")}
                type="button"
              >
                Open advanced step
              </button>
            </div>
          </section>

          <div hidden={activeStudioStep !== "preview"} ref={previewPanelRef}>
            {activePreviewCourse ? (
              <RuntimePlayer course={activePreviewCourse} />
            ) : (
              <section className="panel runtime-panel placeholder-panel">
                <p className="eyebrow">Learner Preview</p>
                <h2>Preview unavailable</h2>
                <p className="panel-copy">
                  Update the preview successfully to render the learner experience
                  and unlock SCORM export.
                </p>
              </section>
            )}
          </div>

          <section className="panel notes-panel" hidden={activeStudioStep !== "export"} ref={validationSectionRef}>
            <p className="eyebrow">Before Export</p>
            <div className="help-inline-row">
              <h2>Ready for LMS validation</h2>
              <HelpHint
                label="SCORM export"
                description={exportSurfaceSummary.description}
              />
            </div>
            <p className="panel-copy">
              Preflight checks the manifest, launch file, course graph, lesson status
              behavior, score behavior, and selected export mode before build output is
              generated.
            </p>
            <p className="editing-surface-note">{exportSurfaceSummary.label}</p>
            <div className="validation-state-grid">
              <span
                className={`status-pill ${
                  exportPlan?.metadata.preflight.ready ? "status-ready" : "status-warn"
                }`}
              >
                {exportPlan?.metadata.preflight.ready
                  ? "Ready for LMS validation"
                  : "Preflight needs attention"}
              </span>
              <span className="status-pill">Export mode: {exportMode}</span>
              <span className="status-pill">
                Diagnostics: {exportMode === "validation" ? "enabled" : "disabled"}
              </span>
              <span className="status-pill">
                Theme: {selectedThemePack?.name ?? "None"}
              </span>
            </div>
            <div className="preflight-check-grid">
              {exportPlan?.metadata.preflight.checks.map((check) => (
                <article className="runtime-status-card" key={check.id}>
                  <span className="runtime-status-label">{check.label}</span>
                  <strong>{check.passed ? "Passed" : "Needs attention"}</strong>
                  <p className="panel-copy">{check.details}</p>
                </article>
              ))}
            </div>
          </section>

          <div hidden={activeStudioStep !== "export"}><LmsValidationPanel catalog={validationCatalog} /></div>
          <div hidden={activeStudioStep !== "export"}><LmsValidationWorkspace
            catalog={validationCatalog}
            onSelectTarget={setSelectedValidationTargetId}
            selectedTargetId={
              selectedValidationTarget?.id ?? validationCatalog.platforms[0].id
            }
          /></div>

          <details className="details-panel studio-advanced-panel" hidden={activeStudioStep !== "advanced"} ref={advancedSectionRef}>
            <summary>Advanced tools for source, testing, and modules</summary>
            <div className="details-copy studio-advanced-stack">

          {selectedProject ? (
          <section className="panel notes-panel">
            <p className="eyebrow">Course Project</p>
            <h2>Current project</h2>
            <p className="panel-copy">
              Projects keep your editable source, saved variants, themes, and
              exported files separate.
              </p>
              <p className="editing-surface-note">{projectSurfaceSummary.description}</p>
              <div className="runtime-status-grid inspector-grid">
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Project</span>
                  <strong>{selectedProject.title}</strong>
                </div>
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Template</span>
                  <strong>{selectedTemplate?.title ?? "None selected"}</strong>
                </div>
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Variant</span>
                  <strong>{variantDraftTitle}</strong>
                </div>
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Theme</span>
                  <strong>{selectedThemePack?.name ?? "None selected"}</strong>
                </div>
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Source status</span>
                  <strong>{selectedProject.validation.ready ? "Ready" : "Needs attention"}</strong>
                </div>
                <div className="runtime-status-card">
                  <span className="runtime-status-label">Build status</span>
                  <strong>{isReadyToExport ? "Export-ready" : "Compile pending"}</strong>
                </div>
              </div>
            </section>
          ) : null}

          {selectedProject ? (
            <section className="panel notes-panel">
              <p className="eyebrow">Course Logic Tests</p>
              <h2>Testable learning logic</h2>
              <p className="panel-copy">
                Course projects can define declarative learner-path tests for
                branching, score, completion, and pass/fail behavior. Run them
                before export or in CI to catch regressions in shared source.
              </p>
              <div className="validation-state-grid">
                <span className="status-pill">
                  Suites: {selectedProject.logicTestSuites.length}
                </span>
                <span className="status-pill">
                  Tests: {activeProjectLogicTests.length}
                </span>
                <span className="status-pill">
                  Scope:{" "}
                  {activeProjectBuildSelection
                    ? `${activeProjectBuildSelection.templateId}/${activeProjectBuildSelection.variantId}/${activeProjectBuildSelection.themeId}`
                    : "project defaults"}
                </span>
              </div>
              {selectedProject.logicTestLoadIssues.length > 0 ? (
                <div className="error-panel">
                  <h3>Logic test source issues</h3>
                  <ValidationIssueList issues={selectedProject.logicTestLoadIssues} />
                </div>
              ) : null}
              <div className="button-row">
                <button
                  className="primary-button"
                  disabled={isRunningLogicTests}
                  onClick={() => void handleRunLogicTests()}
                  type="button"
                >
                  {isRunningLogicTests ? "Running tests..." : "Run logic tests"}
                </button>
                {logicTestRun ? (
                  <>
                    <button
                      className="ghost-button"
                      onClick={() => downloadLogicTestReport("json", logicTestRun)}
                      type="button"
                    >
                      Download JSON report
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => downloadLogicTestReport("markdown", logicTestRun)}
                      type="button"
                    >
                      Download test summary
                    </button>
                  </>
                ) : null}
              </div>
              <div className="preflight-check-grid">
                {activeProjectLogicTests.map((testCase) => (
                  <article
                    className="runtime-status-card"
                    key={`${testCase.suiteId}-${testCase.testId}`}
                  >
                    <span className="runtime-status-label">
                      {testCase.suiteTitle}
                    </span>
                    <strong>{testCase.name}</strong>
                    <p className="panel-copy">{testCase.description}</p>
                    <p className="panel-copy">{testCase.suiteSourcePath}</p>
                  </article>
                ))}
              </div>
              {logicTestRun ? (
                <div className="panel-subsection">
                  <div className="runtime-status-grid inspector-grid">
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Last run</span>
                      <strong>{formatBuildTimestamp(logicTestRun.report.generatedAt)}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Passed</span>
                      <strong>{logicTestRun.report.passedTests}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Failed</span>
                      <strong>{logicTestRun.report.failedTests}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Coverage targets</span>
                      <strong>{logicTestRun.report.coverage.length}</strong>
                    </div>
                  </div>
                  {logicTestRun.report.failedTests > 0 ? (
                    <div className="error-panel">
                      <h3>Failing logic tests</h3>
                      <div className="preflight-check-grid">
                        {logicTestRun.report.results
                          .filter((result) => !result.success)
                          .map((result) => (
                            <article
                              className="runtime-status-card"
                              key={`${result.suiteId}-${result.testId}-failure`}
                            >
                              <span className="runtime-status-label">
                                {result.targetKey}
                              </span>
                              <strong>
                                {result.suiteId}/{result.testId}
                              </strong>
                              <p className="panel-copy">
                                Expected terminal <code>{result.expected.terminalStep ?? "any"}</code>,
                                actual <code>{result.actual.terminalStep}</code>. Score{" "}
                                {result.actual.score}. Path: {result.actual.pathTaken.join(" -> ")}
                              </p>
                              <ValidationIssueList
                                issues={result.errors.map((error) => error.message)}
                              />
                            </article>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="preflight-check-grid">
                    {logicTestRun.report.coverage.map((coverage) => (
                      <article className="runtime-status-card" key={coverage.targetKey}>
                        <span className="runtime-status-label">{coverage.targetKey}</span>
                        <strong>{coverage.courseTitle}</strong>
                        <p className="panel-copy">
                          Visited steps: {coverage.visitedSteps.join(", ")}
                        </p>
                        <p className="panel-copy">
                          Untested interactive steps:{" "}
                          {coverage.untestedInteractiveSteps.length > 0
                            ? coverage.untestedInteractiveSteps.join(", ")
                            : "none"}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {sharedModuleFamilies.length > 0 ? (
            <section className="panel notes-panel">
              <p className="eyebrow">Shared Module Library</p>
              <h2>Compose courses from reusable modules</h2>
              <p className="panel-copy">
                Shared modules are first-class source assets. Browse the library,
                inspect versions and usage, include modules in course source, and see
                which builds depend on each reusable learning component.
              </p>
              <div className="validation-state-grid">
                <span className="status-pill">
                  {sharedModuleFamilies.length} module famil{sharedModuleFamilies.length === 1 ? "y" : "ies"}
                </span>
                {activeModuleDependencies.length > 0 ? (
                  activeModuleDependencies.map((dependency) => (
                    <span className="status-pill" key={`${dependency.moduleId}-${dependency.version}`}>
                      Using: {dependency.moduleId}@{dependency.version}
                    </span>
                  ))
                ) : (
                  <span className="status-pill">No shared modules in the active source</span>
                )}
              </div>
              <div className="template-data-grid">
                <label className="template-field">
                  <span className="template-field-label">Search modules</span>
                  <input
                    className="template-field-input"
                    onChange={(event) => setModuleSearchQuery(event.target.value)}
                    placeholder="Search by name, id, or tag"
                    value={moduleSearchQuery}
                  />
                </label>
                <label className="template-field">
                  <span className="template-field-label">Category</span>
                  <select
                    className="template-field-input"
                    onChange={(event) => setModuleCategoryFilter(event.target.value)}
                    value={moduleCategoryFilter}
                  >
                    {moduleCategories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all" ? "All categories" : category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="preflight-check-grid">
                {filteredSharedModuleFamilies.map((family) => {
                  const isActive = selectedSharedModuleFamily?.id === family.id;

                  return (
                    <article className="runtime-status-card" key={family.id}>
                      <span className="runtime-status-label">{family.category}</span>
                      <strong>{family.title}</strong>
                      <p className="panel-copy">
                        {family.id} | Latest {family.latestVersion} | {family.versionCount} version
                        {family.versionCount === 1 ? "" : "s"}
                      </p>
                      <p className="panel-copy">
                        Used by {family.usedByCount} build
                        {family.usedByCount === 1 ? "" : "s"} |{" "}
                        {family.testStatus === "module-tests"
                          ? "Module tests declared"
                          : family.testStatus === "course-tests"
                            ? "Covered by course tests"
                            : "No test coverage yet"}
                      </p>
                      <p className="panel-copy">{family.description}</p>
                      <div className="button-row">
                        <button
                          className={isActive ? "primary-button" : "ghost-button"}
                          onClick={() => {
                            setSelectedModuleFamilyId(family.id);
                            setSelectedModuleVersion(family.latestVersion);
                          }}
                          type="button"
                        >
                          {isActive ? "Selected" : "Inspect"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {filteredSharedModuleFamilies.length === 0 ? (
                <div className="template-data-empty">
                  <p className="panel-copy">
                    No shared modules match the current search and category filters.
                  </p>
                </div>
              ) : null}
              {selectedSharedModule ? (
                <div className="panel-subsection">
                  <div className="section-heading-row">
                    <div>
                      <p className="eyebrow">Selected module family</p>
                      <p className="panel-copy section-copy">
                        Modules are reusable source components. Include them with
                        explicit version pins, inspect where they are reused, and keep
                        course logic tied back to shared source.
                      </p>
                    </div>
                    <div className="button-row">
                      <button
                        className="ghost-button"
                        onClick={() =>
                          downloadTextFile(
                            selectedSharedModule.sourcePath.split("/").pop() ??
                              `${selectedSharedModule.id}.yaml`,
                            yaml.dump(
                              {
                                id: selectedSharedModule.id,
                                title: selectedSharedModule.title,
                                description: selectedSharedModule.description,
                                version: selectedSharedModule.version,
                                category: selectedSharedModule.category,
                                tags: selectedSharedModule.tags,
                                lastUpdated: selectedSharedModule.lastUpdated,
                                deprecated: selectedSharedModule.deprecated,
                                ...(selectedSharedModule.variableSchema
                                  ? {
                                      variableSchema:
                                        selectedSharedModule.variableSchema,
                                    }
                                  : {}),
                                templateData: selectedSharedModule.templateData,
                                blocks: selectedSharedModule.blocks,
                                nodes: selectedSharedModule.nodes,
                                tests: selectedSharedModule.tests,
                                metadata: selectedSharedModule.metadata,
                              },
                              {
                                lineWidth: 100,
                                noRefs: true,
                              }
                            )
                          )
                        }
                        type="button"
                      >
                        Download Module Source
                      </button>
                      <button
                        className="ghost-button"
                        onClick={handleInsertSharedModule}
                        type="button"
                      >
                        Include In Source
                      </button>
                      {selectedProjectAffectedTargets.length > 0 ? (
                        <button
                          className="ghost-button"
                          onClick={() => void handleBuildAffectedModuleTargets()}
                          type="button"
                        >
                          Build Affected In Project
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="runtime-status-grid inspector-grid">
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Module id</span>
                      <strong>{selectedSharedModuleFamily?.id}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Selected version</span>
                      <strong>{selectedSharedModule.version}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Latest version</span>
                      <strong>{selectedSharedModuleFamily?.latestVersion}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Used by</span>
                      <strong>
                        {selectedModuleUsageTargets.length} build target
                        {selectedModuleUsageTargets.length === 1 ? "" : "s"}
                      </strong>
                    </div>
                  </div>
                  <p className="panel-copy">
                    Tags: {selectedSharedModule.tags.join(", ")} | Last updated:{" "}
                    {selectedSharedModule.lastUpdated}
                  </p>
                  <div className="template-data-grid">
                    <label className="template-field">
                      <span className="template-field-label">Version pin</span>
                      <select
                        className="template-field-input"
                        onChange={(event) => setSelectedModuleVersion(event.target.value)}
                        value={selectedSharedModule.version}
                      >
                        {selectedSharedModuleFamily?.versions.map((moduleVersion) => (
                          <option key={moduleVersion.version} value={moduleVersion.version}>
                            {moduleVersion.version}
                            {moduleVersion.version ===
                            selectedSharedModuleFamily.latestVersion
                              ? " (latest)"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="template-field">
                      <span className="template-field-label">Source path</span>
                      <input
                        className="template-field-input"
                        readOnly
                        value={selectedSharedModule.sourcePath}
                      />
                    </label>
                  </div>
                  <div className="preflight-check-grid">
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Current source</span>
                      <strong>
                        {selectedActiveModuleDependency
                          ? `${selectedActiveModuleDependency.moduleId}@${selectedActiveModuleDependency.version}`
                          : "Not in active source"}
                      </strong>
                      <p className="panel-copy">
                        {selectedActiveModuleDependency
                          ? compareModuleVersions(
                              selectedActiveModuleDependency.version,
                              selectedSharedModuleFamily?.latestVersion ??
                                selectedSharedModule.version
                            ) < 0
                            ? `Upgrade available: ${selectedActiveModuleDependency.version} -> ${selectedSharedModuleFamily?.latestVersion}.`
                            : "The active source already pins the current latest version."
                          : "Include the module in source mode to make the dependency explicit in the course source."}
                      </p>
                    </article>
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Dependencies</span>
                      <strong>{selectedSharedModule.dependencyReferences.length}</strong>
                      <p className="panel-copy">
                        {selectedSharedModule.dependencyReferences.length > 0
                          ? selectedSharedModule.dependencyReferences
                              .map(
                                (dependency) =>
                                  `${dependency.moduleId}@${dependency.version ?? "latest"}`
                              )
                              .join(", ")
                          : "This module expands directly without nesting other shared modules."}
                      </p>
                    </article>
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Variables</span>
                      <strong>{selectedModuleFields.length}</strong>
                      <p className="panel-copy">
                        {selectedModuleFields.length > 0
                          ? selectedModuleFields
                              .map((field) => field.label)
                              .join(", ")
                          : "This module does not declare include-time variables."}
                      </p>
                    </article>
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Tests</span>
                      <strong>
                        {selectedSharedModule.tests.length > 0
                          ? `${selectedSharedModule.tests.length} module test${
                              selectedSharedModule.tests.length === 1 ? "" : "s"
                            }`
                          : "Course-level only"}
                      </strong>
                      <p className="panel-copy">
                        {summarizeModuleUsageCoverage(selectedModuleUsageTargets)}
                      </p>
                    </article>
                  </div>
                  {selectedModuleFields.length > 0 ? (
                    <div className="panel-subsection">
                      <p className="eyebrow">Include variables</p>
                      <p className="panel-copy section-copy">
                        Use version-pinned includes plus explicit variable overrides so
                        module composition stays deterministic in source control.
                      </p>
                      <TemplateDataEditor
                        fields={selectedModuleFields}
                        onChange={(key, value) =>
                          setModuleIncludeValues((currentValues) => ({
                            ...currentValues,
                            [key]: value,
                          }))
                        }
                        values={moduleIncludeValues}
                      />
                    </div>
                  ) : null}
                  {selectedSharedModule.tests.length > 0 ? (
                    <div className="panel-subsection">
                      <p className="eyebrow">Declared module tests</p>
                      <div className="preflight-check-grid">
                        {selectedSharedModule.tests.map((moduleTest) => (
                          <article
                            className="runtime-status-card"
                            key={`${selectedSharedModule.id}-${moduleTest.id}`}
                          >
                            <span className="runtime-status-label">{moduleTest.id}</span>
                            <strong>{moduleTest.name}</strong>
                            <p className="panel-copy">{moduleTest.description}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="panel-subsection">
                    <p className="eyebrow">Used by</p>
                    <p className="panel-copy section-copy">
                      Shared-module reuse is visible before build time. Use this list to
                      inspect which course families and targets would be affected by a
                      module change.
                    </p>
                    <div className="preflight-check-grid">
                      {selectedModuleUsageTargets.length > 0 ? (
                        selectedModuleUsageTargets.map((target) => (
                          <article
                            className="runtime-status-card"
                            key={`${target.projectId}-${target.targetKey}-${target.version}`}
                          >
                            <span className="runtime-status-label">
                              {target.projectId}
                            </span>
                            <strong>{target.courseTitle}</strong>
                            <p className="panel-copy">
                              {target.targetKey} | {target.version} |{" "}
                              {target.logicTestCount > 0
                                ? `${target.logicTestCount} logic test suite${
                                    target.logicTestCount === 1 ? "" : "s"
                                  }`
                                : "No logic tests"}
                            </p>
                          </article>
                        ))
                      ) : (
                        <article className="runtime-status-card">
                          <span className="runtime-status-label">Used by</span>
                          <strong>Not yet referenced</strong>
                          <p className="panel-copy">
                            No current starter project depends on this module family yet.
                          </p>
                        </article>
                      )}
                    </div>
                  </div>
                  <div className="panel-subsection">
                    <div className="section-heading-row">
                      <div>
                        <p className="eyebrow">Extract module draft</p>
                        <p className="panel-copy section-copy">
                          Turn a current source step into a reusable module draft. Sapio
                          Forge downloads the new module source and registry entry, then
                          replaces the step with a pinned include reference.
                        </p>
                      </div>
                      <button
                        className="ghost-button"
                        onClick={handleExtractSharedModule}
                        type="button"
                      >
                        Extract Step To Module Draft
                      </button>
                    </div>
                    <div className="template-data-grid">
                      <label className="template-field">
                        <span className="template-field-label">Source step</span>
                        <select
                          className="template-field-input"
                          onChange={(event) => setModuleExtractStepId(event.target.value)}
                          value={moduleExtractStepId ?? ""}
                        >
                          {extractableModuleSteps.map((step) => (
                            <option key={step.id} value={step.id}>
                              {step.id} - {step.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Module id</span>
                        <input
                          className="template-field-input"
                          onChange={(event) => setModuleDraftId(event.target.value)}
                          value={moduleDraftId}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Module title</span>
                        <input
                          className="template-field-input"
                          onChange={(event) => setModuleDraftTitle(event.target.value)}
                          value={moduleDraftTitle}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Description</span>
                        <input
                          className="template-field-input"
                          onChange={(event) => setModuleDraftDescription(event.target.value)}
                          value={moduleDraftDescription}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Category</span>
                        <input
                          className="template-field-input"
                          onChange={(event) => setModuleDraftCategory(event.target.value)}
                          value={moduleDraftCategory}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Tags</span>
                        <input
                          className="template-field-input"
                          onChange={(event) => setModuleDraftTags(event.target.value)}
                          placeholder="security, intro, reporting"
                          value={moduleDraftTags}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {buildHistory.length > 0 ? (
            <section className="panel notes-panel">
              <p className="eyebrow">Build History</p>
              <h2>Recent project runs</h2>
              <p className="panel-copy">
                Session-scoped history for project validation and build runs. Use
                this to confirm recent targets, download generated artifacts again,
                and verify whether a build manifest was produced.
              </p>
              <div className="preflight-check-grid">
                {buildHistory.map((entry) => (
                  <article className="runtime-status-card" key={entry.id}>
                    <span className="runtime-status-label">{entry.label}</span>
                    <strong>{entry.success ? "Success" : "Failed"}</strong>
                    <p className="panel-copy">
                      {entry.target} | {formatBuildTimestamp(entry.timestamp)}
                      {entry.themeName ? ` | ${entry.themeName}` : ""}
                    </p>
                    <p className="panel-copy">
                      {entry.manifestAvailable
                        ? "Build manifest generated."
                        : "No build manifest generated."}
                    </p>
                    {entry.objectUrl && entry.fileName ? (
                      <button
                        className="ghost-button"
                        onClick={() => downloadPackage(entry.fileName!, entry.objectUrl!)}
                        type="button"
                      >
                        Download {entry.fileName}
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel notes-panel">
            <p className="eyebrow">Compile Stages</p>
            <h2>Inspectable build pipeline</h2>
            <p className="panel-copy">
              Source, builder edits, preview, and export all flow through the same
              canonical normalized course model. These stages show the current draft
              build status.
            </p>
            <div className="preflight-check-grid">
              {activeSnapshot.stages.map((stage) => (
                <article className="runtime-status-card" key={stage.id}>
                  <span className="runtime-status-label">{stage.label}</span>
                  <strong>
                    {stage.status === "success"
                      ? "Passed"
                      : stage.status === "failed"
                        ? "Failed"
                        : "Pending"}
                  </strong>
                  <p className="panel-copy">{stage.details}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel notes-panel">
            <p className="eyebrow">Structure Inspector</p>
            <h2>Canonical model summary</h2>
            <div className="runtime-status-grid inspector-grid">
              <div className="runtime-status-card">
                <span className="runtime-status-label">Course id</span>
                <strong>{structureInspector.courseId}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Start node</span>
                <strong>{structureInspector.startNodeId}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Variables</span>
                <strong>{structureInspector.variableCount}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Scenario state</span>
                <strong>{structureInspector.scenarioStateCount}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Node count</span>
                <strong>{structureInspector.nodeCount}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Scene shells</span>
                <strong>{structureInspector.sceneLayouts.length}</strong>
              </div>
              <div className="runtime-status-card">
                <span className="runtime-status-label">Components</span>
                <strong>{structureInspector.componentCount}</strong>
              </div>
            </div>
            <p className="panel-copy">
              Scenario state:{" "}
              {structureInspector.scenarioStateKeys.length > 0
                ? structureInspector.scenarioStateKeys.join(", ")
                : "Not defined"}
            </p>
            <p className="panel-copy">
              Node types used:{" "}
              {structureInspector.nodeTypes.length > 0
                ? structureInspector.nodeTypes.join(", ")
                : "Unavailable"}
            </p>
            <p className="panel-copy">
              Scene shells:{" "}
              {structureInspector.sceneLayouts.length > 0
                ? structureInspector.sceneLayouts.join(", ")
                : "Unavailable"}
            </p>
            <p className="panel-copy">
              Component types:{" "}
              {structureInspector.componentTypes.length > 0
                ? structureInspector.componentTypes.join(", ")
                : "Unavailable"}
            </p>
            <div className="validation-state-grid">
              {structureInspector.validationStates.map((state) => (
                <span
                  className={`status-pill ${
                    state.valid ? "status-ready" : "status-warn"
                  }`}
                  key={state.label}
                >
                  {state.label}
                </span>
              ))}
            </div>
          </section>

            </div>
          </details>

        </div>
      </section>

      {!isPathChooserOpen ? (
        <GuidedWalkthrough
          key={tourInstanceKey}
          steps={walkthroughSteps}
          storageKey={DEMO_WALKTHROUGH_STORAGE_KEY}
        />
      ) : null}
      <StudioPathChooser
        onChoosePath={handleChooseStartingPath}
        onDismiss={handleDismissPathChooser}
        open={isPathChooserOpen}
        paths={STUDIO_STARTING_PATHS}
      />
      <StudioFeedbackPanel
        captureTargetRef={studioRootRef}
        context={studioFeedbackContext}
      />
    </main>
  );
}





