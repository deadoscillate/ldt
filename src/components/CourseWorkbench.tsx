"use client";

import yaml from "js-yaml";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
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
import type { TemplateVariableSchema } from "@/lib/course/template-variables";
import type { CompiledCourse } from "@/lib/course/types";
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
import type { SharedModuleLibrary } from "@/lib/module-library/schema";
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

const DEMO_WALKTHROUGH_STORAGE_KEY = "ldt:studio:walkthrough-dismissed";

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
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

function insertSharedModuleIntoYaml(
  source: string,
  moduleId: string,
  version: string
): string {
  const parsed = yaml.load(source);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Source definition must be valid YAML before inserting a shared module.");
  }

  const document = parsed as {
    nodes?: unknown[];
  };

  if (!Array.isArray(document.nodes)) {
    throw new Error('Source definition must include a top-level "nodes" array.');
  }

  document.nodes.push({
    include: {
      module: moduleId,
      version,
    },
  });

  return yaml.dump(document, {
    lineWidth: 100,
    noRefs: true,
  });
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
  const templateSelectorRef = useRef<HTMLDivElement>(null);
  const yamlEditorRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
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
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    moduleLibrary?.modules[0]?.id ?? null
  );
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

  const availablePacks =
    availableProjects.length > 0
      ? availableProjects.map(courseProjectToTemplatePack)
      : templatePacks;
  const availableSharedModules = moduleLibrary?.modules ?? [];
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
  const selectedSharedModule =
    availableSharedModules.find((module) => module.id === selectedModuleId) ??
    availableSharedModules[0] ??
    null;
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
    moduleUsageIndex[selectedSharedModule?.id ?? ""] ?? [];
  const selectedProjectAffectedTargets = selectedProject
    ? selectedModuleUsageTargets.filter(
        (target) => target.projectId === selectedProject.id
      )
    : [];
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
    setSourceLabel(`Builder-generated variant: ${variantDraftTitle}`);

    startTransition(() => {
      setDraftSnapshot(nextSnapshot);
    });

    scheduleBuilderEditEvent(nextBuilderCourse, nextSnapshot.errors.length);

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }
  }

  function openAuthoringGuide(): void {
    setIsAuthoringGuideOpen(true);
    authoringGuideRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function openFirstModuleGuide(): void {
    setIsFirstModuleGuideOpen(true);
    firstModuleGuideRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
        title: "Builder sync failed",
        message:
          "Fix the current source issues first, then sync the builder from the canonical normalized source definition.",
      });
      return;
    }

    setAuthoringMode("builder");
    setActiveStudioSurface("builder");
    setFeedback({
      tone: "success",
      title: "Builder synced",
      message:
        "Builder mode now reflects the latest validated source definition. Advanced template constructs are flattened into the guided builder model.",
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
      const nextSource = insertSharedModuleIntoYaml(
        draftYaml,
        selectedSharedModule.id,
        selectedSharedModule.version
      );
      setAuthoringMode("source");
      setActiveStudioSurface("source");
      setDraftYaml(nextSource);
      clearLastExportedPackage();
      clearLastBatchExport();
      setSourceLabel(`Source definition updated with ${selectedSharedModule.id}`);
      updateDraftPipeline(
        nextSource,
        templateDataValues,
        {
          tone: "success",
          title: "Shared module inserted",
          message:
            "The module include was appended to the source definition. Wire the next-step references in source mode so the new shared step participates in the course flow.",
        },
        false,
        selectedVariableSchema
      );
      trackStudioEvent("shared_module_included", {
        moduleId: selectedSharedModule.id,
        moduleVersion: selectedSharedModule.version,
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
      targetRef: templateSelectorRef,
      title: availableProjects.length > 0 ? "Start with a source project." : "Start with a template pack.",
      description:
        availableProjects.length > 0
          ? "Choose a source project, then select the template, variable set, and theme you want to compile."
          : "Choose a pack, then select a shared template and variable set for the course family you want to generate.",
    },
    {
      targetRef: yamlEditorRef,
      title: "Edit shared source or builder fields.",
      description:
        "Update the shared branching structure in YAML or use Builder View while keeping the structured source definition transparent.",
    },
    {
      targetRef: previewPanelRef,
      title: "Preview the compiled variant instantly.",
      description:
        "Run the learner path in the browser and watch the current node, score, and completion status update as you click through it.",
    },
    {
      targetRef: exportButtonRef,
      title: "Export a SCORM package for your LMS.",
      description:
        "Generate a SCORM 1.2 zip, download it, and inspect the exact package contents used for LMS delivery.",
    },
  ];

  return (
    <main className="page-shell" ref={studioRootRef}>
      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">{BRAND.studioName}</p>
          <h1>Structured authoring, compiled preview, reproducible SCORM output.</h1>
          <p className="hero-subheadline">{BRAND.positioningStatement}</p>
          <WorkflowSteps steps={["Project", "Template", "Variant", "Theme", "SCORM"]} />
          <p className="hero-copy">
            Welcome to {BRAND.studioName}. Define course source, compile it into a
            learner-ready preview, and generate SCORM as a build artifact.
          </p>
        </div>
        <div className="hero-summary">
          <div className="summary-card">
            <strong>Source definition</strong>
            <span>Template variables, source YAML, and guided builder fields stay in one structured definition.</span>
          </div>
          <div className="summary-card">
            <strong>Compiled preview</strong>
            <span>Compile the source into a validated runtime preview before exporting any package.</span>
          </div>
          <div className="summary-card">
            <strong>Export build</strong>
            <span>Generate a SCORM 1.2 package as build output from the same validated source.</span>
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

      {!onboardingState.startHereDismissed ? (
        <section className="panel onboarding-panel">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Start Here</p>
              <h2>Welcome to Sapio Forge Studio</h2>
              <p className="panel-copy">
                Use Source view to define structured training modules. Use Builder
                view to work through guided fields and preview the compiled course.
                Sapio Forge separates course source from course output so training
                systems stay reusable, testable, and version-controlled.
              </p>
              {selectedStartingPath ? (
                <p className="panel-copy">
                  Current path: <strong>{selectedStartingPath.title}</strong>.{" "}
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
                Build your first course
              </button>
              <button
                className="ghost-button"
                onClick={() => handleChooseStartingPath("intermediate")}
                type="button"
              >
                Start from a template pack
              </button>
              <button
                className="ghost-button"
                onClick={() => handleChooseStartingPath("advanced")}
                type="button"
              >
                Open source view
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
                Build Your First Module
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
              label="Source definition"
              description="The YAML and project files you edit. This stays authoritative for preview and export."
            />
            <HelpHint
              label="Builder mode"
              description="A guided form layer that writes structured source for you."
            />
            <HelpHint
              label="Template pack"
              description="A reusable template plus saved variable sets for repeatable course families."
            />
            <HelpHint
              label="Variant"
              description="One saved set of template values that generates a specific course version."
            />
            <HelpHint
              label="Theme"
              description="Branding tokens applied at build time without changing course structure."
            />
            <HelpHint
              label="Compiled preview"
              description="The learner-facing runtime generated from validated source."
            />
            <HelpHint
              label="Export build"
              description="A generated SCORM package produced from validated source and selected theme."
            />
            <HelpHint
              label="SCORM package"
              description="The zip you upload to SCORM Cloud or your LMS. It is a build artifact, not the editable source."
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
                <p className="eyebrow">First-module checklist</p>
                <p className="panel-copy section-copy">
                  Use this as the fastest path to a first successful compiled preview
                  and SCORM export.
                </p>
              </div>
              <div className="button-row">
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
                  <span className="runtime-status-label">Advanced example</span>
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
              <span className="runtime-status-label">Use Builder mode when</span>
              <strong>You want the fastest first course</strong>
              <p className="panel-copy">
                Builder mode is the best path for quick course creation, form-based
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
            <span className="status-pill">Use Builder mode for quick course creation</span>
            <span className="status-pill">Use the starter repo for source-controlled team workflows</span>
            <span className="status-pill">Source stays editable; SCORM stays generated</span>
          </div>
        </section>
      ) : null}

      <section className="workbench-grid">
        <div className="panel editor-panel">
          <div className="panel-section" ref={templateSelectorRef}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">
                  {availableProjects.length > 0 ? "Source Projects" : "Template Packs"}
                </p>
                <div className="help-inline-row">
                  <p className="panel-copy section-copy">
                    {projectSurfaceSummary.label}
                  </p>
                  <HelpHint
                    label="Source definition"
                    description="This is the structured source project that drives compile, preview, and export."
                  />
                </div>
                <p className="panel-copy section-copy">
                  {availableProjects.length > 0
                    ? "Choose a source project, then select the template, variable set, and theme that will drive the compiled preview and exported build. The starter examples in this studio load directly from course-projects/."
                    : "Choose a pack, select a shared template, then swap variable sets to generate repeatable course variants from one source."}
                </p>
              </div>
              <div className="button-row">
                {selectedProject ? (
                  <>
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
                    <button
                      className="ghost-button"
                      onClick={() => void handleExportProjectSource()}
                      type="button"
                    >
                      Export Project Source
                    </button>
                  </>
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
                      {activePackId === pack.id
                        ? availableProjects.length > 0
                          ? "Selected project"
                          : "Selected pack"
                        : availableProjects.length > 0
                          ? "Source project"
                          : "Template pack"}
                    </span>
                    <span className="scenario-pill">
                      {selectedProject?.id === pack.id
                        ? selectedProject.version
                        : pack.category}
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
                          ? "Templates define the reusable source structure inside this project."
                          : "Shared template source stays stable while variable sets generate course families quickly."}
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
                              ? "Active template"
                              : "Shared source"}
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
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTemplate ? (
                  <div className="panel-subsection">
                    <div className="section-heading-row">
                      <div>
                        <p className="eyebrow">Variable Sets</p>
                        <p className="panel-copy section-copy">
                          Variable sets are plain-text source files that generate
                          specific variants from the same template and source project.
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

          <div className="panel-section">
            <p className="eyebrow">Template Variables</p>
            <div className="help-inline-row">
              <h2>Schema-guided variable sets</h2>
              <HelpHint
                label="Variant"
                description="A variant is one saved set of template values that generates a specific course version."
              />
            </div>
            <p className="panel-copy section-copy">
              Variable schemas keep course-family generation predictable. These
              values are applied at compile time before preview and export.
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

          <div className="panel-section">
            <p className="eyebrow">Theme Packs</p>
            <div className="help-inline-row">
              <h2>Reusable branded presentation</h2>
              <HelpHint
                label="Theme"
                description="A theme pack changes presentation tokens like color, typography, and logo without changing course structure."
              />
            </div>
            <p className="panel-copy section-copy">
              Theme packs style the compiled preview and exported SCORM package
              without changing the structured source definition. Keep course families
              reusable, then swap branding as a separate build concern.
            </p>
            <p className="editing-surface-note">{themeSurfaceSummary.description}</p>
            <div className="validation-state-grid">
              <span className="status-pill">Source remains structural</span>
              <span className="status-pill">Theme pack selected at build time</span>
              <span className="status-pill">SCORM zip remains a build artifact</span>
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

          <section className="panel repeatable-workflow-panel">
            <p className="eyebrow">Built for Repeatable Workflows</p>
            <h2>Create one template, generate many variants</h2>
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

          <div className="panel-header">
            <div>
              <p className="eyebrow">Authoring Workflow</p>
              <div className="help-inline-row">
                <h2>
                  {authoringMode === "builder"
                    ? "Variant Builder Draft"
                    : "Source Definition"}
                </h2>
                <HelpHint
                  label={authoringMode === "builder" ? "Builder mode" : "Source definition"}
                  description={authoringSurfaceSummary.description}
                />
              </div>
              <p className="panel-copy">
                {authoringMode === "builder"
                  ? "Use guided forms to update the current source-backed variant, then switch to Source view any time to inspect or edit the YAML directly."
                  : "Keep YAML as the source of truth. Validation covers schema shape, variables, layouts, and branching integrity before normalization."}
              </p>
              <p className="editing-surface-note">{authoringSurfaceSummary.label}</p>
              <button
                className="inline-link-button"
                onClick={openAuthoringGuide}
                type="button"
              >
                Authoring Guide
              </button>
              <button
                className="inline-link-button"
                onClick={openFirstModuleGuide}
                type="button"
              >
                Build Your First Module
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
                className={`ghost-button ${authoringMode === "builder" ? "toggle-button-active" : ""}`}
                onClick={() => setAuthoringMode("builder")}
                type="button"
              >
                Builder View
              </button>
              <button
                className={`ghost-button ${authoringMode === "source" ? "toggle-button-active" : ""}`}
                onClick={() => setAuthoringMode("source")}
                type="button"
              >
                Source View
              </button>
              <button
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload source YAML
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
                Download source YAML
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
                {isPending ? "Compiling..." : "Compile source"}
              </button>
            </div>
          </div>

          <details
            className="details-panel"
            id="first-module-guide"
            onToggle={(event) => setIsFirstModuleGuideOpen(event.currentTarget.open)}
            open={isFirstModuleGuideOpen}
            ref={firstModuleGuideRef}
          >
            <summary>Build Your First Module</summary>
            <div className="details-copy">
              <ol className="guide-bullet-list ordered-guide-list">
                <li>
                  Start with <strong>Build your first course</strong> to load the
                  simplest starter project in Builder mode.
                </li>
                <li>
                  Edit the title, content, or choices in Builder mode. If you want
                  to inspect the YAML, switch to <strong>Source View</strong>.
                </li>
                <li>
                  Click <strong>Compile source</strong> and use the compiled preview
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
                  <span className="runtime-status-label">Advanced example</span>
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
            id="authoring-guide"
            onToggle={(event) => setIsAuthoringGuideOpen(event.currentTarget.open)}
            open={isAuthoringGuideOpen}
            ref={authoringGuideRef}
          >
            <summary>Authoring Guide</summary>
            <div className="details-copy">
              <p className="panel-copy">
                Builder mode and Source view both produce the same structured course
                definition. Start with top-level course metadata, add nodes in order,
                and use branching targets like <code>next</code>, <code>passNext</code>,
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
                  <strong>Builder and Source:</strong> Builder mode is a guided
                  layer that writes structured YAML internally. Switch to Source
                  view any time to review or edit the underlying definition.
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

          <div className="source-row">
            <span className="status-pill">{sourceLabel}</span>
            <span
              className={`status-pill ${
                hasUncompiledChanges ? "status-warn" : "status-ready"
              }`}
            >
              {hasUncompiledChanges
                ? "Draft source changed since the last compiled build"
                : "Compiled preview is in sync with validated source"}
            </span>
          </div>

          {authoringMode === "builder" ? (
            <div ref={yamlEditorRef}>
              <CourseBuilder
                course={builderDraft}
                onChange={applyBuilderCourse}
                validationErrors={displayedValidationErrors}
              />
            </div>
          ) : (
            <div ref={yamlEditorRef}>
              <YamlEditor
                onChange={handleYamlChange}
                placeholder="Paste course YAML here..."
                value={draftYaml}
              />
            </div>
          )}

          {feedback ? (
            <div className={`feedback-banner feedback-${feedback.tone}`}>
              <strong>{feedback.title}</strong>
              <span>{feedback.message}</span>
            </div>
          ) : null}

          {displayedValidationErrors.length > 0 ? (
            <div className="error-panel">
              <h3>
                {authoringMode === "builder"
                  ? "Builder issues to fix"
                  : "Source issues to fix"}
              </h3>
              <p className="panel-copy">
                These messages update from the current draft and are tied to the
                active editing mode, so you can fix missing fields, broken paths,
                and missing variables before you export anything.
              </p>
              <ValidationIssueList issues={displayedValidationErrors} />
            </div>
          ) : null}

          {activeSnapshot.warnings.length > 0 ? (
            <div className="error-panel">
              <h3>Build warnings to review</h3>
              <p className="panel-copy">
                These warnings do not block compile, but they do affect
                reproducibility and shared-source hygiene.
              </p>
              <ValidationIssueList issues={activeSnapshot.warnings} />
            </div>
          ) : null}

          <div className="export-bar">
            <div>
              <p className="eyebrow">Export Build</p>
              <h3>Build SCORM 1.2 package</h3>
              <p className="panel-copy">
                Choose a standard package or an LMS validation build with diagnostics.
                The source definition stays unchanged; export remains a build step.
              </p>
              <p className="panel-copy">
                SCORM Cloud is the current validated baseline. Broader LMS testing is
                tracked in the proof center and should use the LMS validation build.
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
                    ? "LMS validation build with diagnostics enabled"
                    : "Standard SCORM 1.2 package with diagnostics disabled"}
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
                  Source project <strong>{selectedProject.id}</strong> stays editable in
                  Git. The SCORM zip and build manifest are generated outputs.
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
            <section className="panel export-result-panel">
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
            <section className="panel export-result-panel">
              <div className="export-result-header">
                <div>
                  <p className="eyebrow">Generated Package</p>
                  <h3>
                    {lastExportedPackage.metadata.exportMode === "validation"
                      ? "LMS validation build generated successfully."
                      : "SCORM 1.2 package generated successfully."}
                  </h3>
                  <p className="panel-copy">
                    The exported SCORM package is a build artifact generated from the
                    validated source definition. Download it again or inspect the file
                    structure before importing it into an LMS.
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

          <details className="details-panel">
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
            <details className="details-panel">
              <summary>
                {selectedProject ? "View source project notes" : "View template pack notes"}
              </summary>
              <pre className="json-preview">{selectedPack.readme}</pre>
            </details>
          ) : null}

          {selectedTemplate ? (
            <details className="details-panel">
              <summary>View template notes and variable schema</summary>
              <div className="details-copy">
                <pre className="json-preview">{selectedTemplate.readme}</pre>
                <pre className="json-preview">{selectedTemplate.schemaYaml}</pre>
              </div>
            </details>
          ) : null}

          <details className="details-panel">
            <summary>View resolved source document</summary>
            <pre className="json-preview">
              {activeSnapshot.expandedCourseJson ||
                "Compile the source to inspect the resolved document."}
            </pre>
          </details>

          <details className="details-panel">
            <summary>View canonical normalized model</summary>
            <pre className="json-preview">
              {activeSnapshot.compiledJson ||
                "Compile the source to inspect the normalized runtime graph."}
            </pre>
          </details>
        </div>

        <div className="preview-column">
          <section className="panel preview-cta-panel">
            <div>
              <p className="eyebrow">Compile Workflow</p>
              <div className="help-inline-row">
                <h2>{"Source definition -> compiled preview -> export build"}</h2>
                <HelpHint
                  label="Compiled preview"
                  description={previewSurfaceSummary.description}
                />
              </div>
              <p className="panel-copy">
                {isReadyToExport
                  ? "The compiled source passed export preflight and is ready for LMS validation."
                  : "Keep the compiled preview in sync with the latest source definition, then clear SCORM preflight before exporting."}
              </p>
              <p className="editing-surface-note">{previewSurfaceSummary.label}</p>
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
          </section>

          {selectedProject ? (
            <section className="panel notes-panel">
              <p className="eyebrow">Source Project</p>
              <h2>Project panel</h2>
              <p className="panel-copy">
                Course projects keep templates, variable sets, themes, and build
                outputs separate. The source project remains the editable system of
                record; compiled preview and SCORM are generated from it.
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

          {availableSharedModules.length > 0 ? (
            <section className="panel notes-panel">
              <p className="eyebrow">Shared Module Library</p>
              <h2>Reusable source modules</h2>
              <p className="panel-copy">
                Shared modules are source assets expanded during compile. They stay in
                the source system of record, show up in dependency graphs, and drive
                affected rebuilds when reused content changes.
              </p>
              <div className="validation-state-grid">
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
              <div className="preflight-check-grid">
                {availableSharedModules.map((module) => {
                  const isActive = selectedSharedModule?.id === module.id;
                  const usageCount = moduleUsageIndex[module.id]?.length ?? 0;

                  return (
                    <article className="runtime-status-card" key={`${module.id}-${module.version}`}>
                      <span className="runtime-status-label">{module.category}</span>
                      <strong>{module.title}</strong>
                      <p className="panel-copy">
                        {module.id}@{module.version} | Used by {usageCount} build
                        {usageCount === 1 ? "" : "s"}
                      </p>
                      <p className="panel-copy">{module.description}</p>
                      <div className="button-row">
                        <button
                          className={isActive ? "primary-button" : "ghost-button"}
                          onClick={() => setSelectedModuleId(module.id)}
                          type="button"
                        >
                          {isActive ? "Selected" : "Inspect"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {selectedSharedModule ? (
                <div className="panel-subsection">
                  <div className="section-heading-row">
                    <div>
                      <p className="eyebrow">Selected module</p>
                      <p className="panel-copy section-copy">
                        Inspect metadata, include the module in source mode, or rebuild
                        the currently selected project's affected targets only.
                      </p>
                    </div>
                    <div className="button-row">
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
                      <strong>{selectedSharedModule.id}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Version</span>
                      <strong>{selectedSharedModule.version}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Category</span>
                      <strong>{selectedSharedModule.category}</strong>
                    </div>
                    <div className="runtime-status-card">
                      <span className="runtime-status-label">Source file</span>
                      <strong>{selectedSharedModule.sourcePath}</strong>
                    </div>
                  </div>
                  <p className="panel-copy">
                    Tags: {selectedSharedModule.tags.join(", ")} | Last updated:{" "}
                    {selectedSharedModule.lastUpdated}
                  </p>
                  <div className="preflight-check-grid">
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Used by</span>
                      <strong>{selectedModuleUsageTargets.length} build target{selectedModuleUsageTargets.length === 1 ? "" : "s"}</strong>
                      <p className="panel-copy">
                        {selectedModuleUsageTargets.length > 0
                          ? selectedModuleUsageTargets
                              .slice(0, 5)
                              .map((target) => `${target.projectId}/${target.targetKey}`)
                              .join(", ")
                          : "No current starter project depends on this module yet."}
                      </p>
                    </article>
                    <article className="runtime-status-card">
                      <span className="runtime-status-label">Current source</span>
                      <strong>
                        {activeModuleDependencies.some(
                          (dependency) => dependency.moduleId === selectedSharedModule.id
                        )
                          ? "In use"
                          : "Not in active source"}
                      </strong>
                      <p className="panel-copy">
                        Insert shared modules into source mode, then wire next-step
                        references explicitly so the compile graph stays reviewable.
                      </p>
                    </article>
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

          <div ref={previewPanelRef}>
            {activePreviewCourse ? (
              <RuntimePlayer course={activePreviewCourse} />
            ) : (
              <section className="panel runtime-panel placeholder-panel">
                <p className="eyebrow">Compiled Preview</p>
                <h2>Compiled preview unavailable</h2>
                <p className="panel-copy">
                  Compile the source successfully to render the learner experience,
                  validate the runtime graph, and unlock SCORM export.
                </p>
              </section>
            )}
          </div>

          <section className="panel notes-panel">
            <p className="eyebrow">SCORM Preflight</p>
            <div className="help-inline-row">
              <h2>Ready for LMS validation</h2>
              <HelpHint
                label="Export build"
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
              <span className="status-pill">
                Export mode: {exportMode}
              </span>
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
                <span className="runtime-status-label">Node count</span>
                <strong>{structureInspector.nodeCount}</strong>
              </div>
            </div>
            <p className="panel-copy">
              Node types used:{" "}
              {structureInspector.nodeTypes.length > 0
                ? structureInspector.nodeTypes.join(", ")
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

          <section className="panel notes-panel">
            <p className="eyebrow">Trust Signal</p>
            <h2>Current validation status</h2>
            <p className="panel-copy">
              Validated in SCORM Cloud for launch, completion, score,
              pass/fail, and resume. Real LMS interoperability still needs
              broader testing.
            </p>
            <div className="trust-grid">
              <span className="trust-pill">Launch passed</span>
              <span className="trust-pill">Completion passed</span>
              <span className="trust-pill">Score passed</span>
              <span className="trust-pill">Resume passed</span>
            </div>
          </section>

          <LmsValidationPanel catalog={validationCatalog} />
          <LmsValidationWorkspace
            catalog={validationCatalog}
            onSelectTarget={setSelectedValidationTargetId}
            selectedTargetId={
              selectedValidationTarget?.id ?? validationCatalog.platforms[0].id
            }
          />
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
