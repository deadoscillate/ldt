"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";

import { CourseBuilder } from "@/components/CourseBuilder";
import { GuidedWalkthrough } from "@/components/GuidedWalkthrough";
import { LmsValidationPanel } from "@/components/LmsValidationPanel";
import { RuntimePlayer } from "@/components/RuntimePlayer";
import { TemplateDataEditor } from "@/components/TemplateDataEditor";
import { ValidationIssueList } from "@/components/ValidationIssueList";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { YamlEditor } from "@/components/YamlEditor";
import {
  builderCourseToYaml,
  compiledCourseToBuilderCourse,
  createEmptyBuilderCourse,
  type BuilderCourse,
} from "@/lib/course/builder";
import { serializeCompiledCourse } from "@/lib/course/compile";
import { buildStructureInspectorData } from "@/lib/course/inspector";
import { trackClientEvent } from "@/lib/events/client";
import {
  collectCourseErrorMessages,
  inspectTemplateFieldsWithOverrides,
  parseAndCompileCourseBundle,
} from "@/lib/course/parse";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { TemplateScalarValue } from "@/lib/course/schema";
import {
  buildCourseProjectReadme,
  buildSourceDownloadFileName,
  createDuplicatedTemplateDraft,
  inferCourseProjectDirectory,
  parseTemplateDataYaml,
  serializeTemplateDataYaml,
} from "@/lib/course/source-files";
import type { TemplateFieldDefinition } from "@/lib/course/template";
import type { CompiledCourse } from "@/lib/course/types";
import {
  buildScormFileName,
  exportCourseAsScormZip,
  SCORM_PACKAGE_CONTENTS,
} from "@/lib/export/scorm-export";
import { clearAllRuntimeStates } from "@/lib/runtime/storage";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface CourseWorkbenchProps {
  samples: CourseSample[];
  validationCatalog: LmsValidationCatalog;
}

interface PreviewState {
  course: CompiledCourse | null;
  source: string;
  errors: string[];
  compiledJson: string;
  expandedCourseJson: string;
  templateDataFingerprint: string;
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
}

type AuthoringMode = "builder" | "source";

const DEMO_WALKTHROUGH_STORAGE_KEY = "ldt:studio:walkthrough-dismissed";

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
  overrides: Record<string, TemplateScalarValue> = {}
): TemplateDraftState | null {
  const fields = inspectTemplateFieldsWithOverrides(source, overrides);

  if (fields === null) {
    return null;
  }

  return {
    fields,
    values: templateFieldsToValues(fields),
  };
}

function collectDraftValidationErrors(
  source: string,
  templateData: Record<string, TemplateScalarValue>
): string[] {
  try {
    parseAndCompileCourseBundle(source, {
      templateDataOverrides: templateData,
    });

    return [];
  } catch (error) {
    return collectCourseErrorMessages(error);
  }
}

function compilePreview(
  source: string,
  templateData: Record<string, TemplateScalarValue>
): PreviewState {
  try {
    const { course, resolvedTemplate } = parseAndCompileCourseBundle(source, {
      templateDataOverrides: templateData,
    });

    return {
      course,
      source,
      errors: [],
      compiledJson: serializeCompiledCourse(course),
      expandedCourseJson: JSON.stringify(resolvedTemplate.document, null, 2),
      templateDataFingerprint: serializeTemplateData(templateData),
    };
  } catch (error) {
    return {
      course: null,
      source,
      errors: collectCourseErrorMessages(error),
      compiledJson: "",
      expandedCourseJson: "",
      templateDataFingerprint: serializeTemplateData(templateData),
    };
  }
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

export function CourseWorkbench({
  samples,
  validationCatalog,
}: CourseWorkbenchProps) {
  const defaultSample = samples[0];
  const defaultTemplateData = parseTemplateDataYaml(defaultSample.templateDataYaml);
  const defaultTemplateDraft = inspectTemplateDraft(
    defaultSample.yaml,
    defaultTemplateData
  ) ?? {
    fields: [],
    values: defaultTemplateData,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateDataFileInputRef = useRef<HTMLInputElement>(null);
  const templateSelectorRef = useRef<HTMLDivElement>(null);
  const yamlEditorRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const authoringGuideRef = useRef<HTMLDetailsElement>(null);
  const exportObjectUrlRef = useRef<string | null>(null);

  const [draftYaml, setDraftYaml] = useState(defaultSample.yaml);
  const [templateFields, setTemplateFields] = useState(defaultTemplateDraft.fields);
  const [templateDataValues, setTemplateDataValues] = useState(
    defaultTemplateDraft.values
  );
  const [previewState, setPreviewState] = useState<PreviewState>(() =>
    compilePreview(defaultSample.yaml, defaultTemplateDraft.values)
  );
  const [draftErrors, setDraftErrors] = useState<string[]>(previewState.errors);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(
    defaultSample.id
  );
  const [sourceLabel, setSourceLabel] = useState(
    `Sample template: ${defaultSample.title}`
  );
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>("builder");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [lastExportedPackage, setLastExportedPackage] =
    useState<ExportedPackageState | null>(null);
  const [isPackageViewerOpen, setIsPackageViewerOpen] = useState(false);
  const [isAuthoringGuideOpen, setIsAuthoringGuideOpen] = useState(false);
  const [tourInstanceKey, setTourInstanceKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [builderCourse, setBuilderCourse] = useState<BuilderCourse>(() =>
    compilePreview(defaultSample.yaml, defaultTemplateDraft.values).course
      ? compiledCourseToBuilderCourse(
          compilePreview(defaultSample.yaml, defaultTemplateDraft.values).course as CompiledCourse
        )
      : createEmptyBuilderCourse()
  );

  const selectedSample =
    samples.find((sample) => sample.id === activeSampleId) ?? null;
  const hasUncompiledChanges =
    draftYaml !== previewState.source ||
    serializeTemplateData(templateDataValues) !== previewState.templateDataFingerprint;
  const displayedValidationErrors = hasUncompiledChanges
    ? draftErrors
    : previewState.errors;
  const isReadyToExport = Boolean(previewState.course) && !hasUncompiledChanges;
  const structureInspector = buildStructureInspectorData({
    course: previewState.course,
    templateFields,
    errors: displayedValidationErrors,
    isReadyToExport,
  });

  useEffect(() => {
    return () => {
      if (exportObjectUrlRef.current) {
        window.URL.revokeObjectURL(exportObjectUrlRef.current);
      }
    };
  }, []);

  function clearLastExportedPackage(): void {
    if (exportObjectUrlRef.current) {
      window.URL.revokeObjectURL(exportObjectUrlRef.current);
      exportObjectUrlRef.current = null;
    }

    setLastExportedPackage(null);
    setIsPackageViewerOpen(false);
  }

  function syncTemplateDraft(
    source: string,
    preserveExistingValues: boolean
  ): Record<string, TemplateScalarValue> {
    const nextTemplateDraft = inspectTemplateDraft(source, templateDataValues);

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

    setBuilderCourse(compiledCourseToBuilderCourse(course));
  }

  function updatePreview(
    source: string,
    nextTemplateData: Record<string, TemplateScalarValue>,
    nextFeedback?: FeedbackState | null,
    syncBuilder = false
  ): PreviewState {
    const nextPreview = compilePreview(source, nextTemplateData);

    startTransition(() => {
      setPreviewState(nextPreview);
    });

    setDraftErrors(nextPreview.errors);

    if (syncBuilder && nextPreview.course) {
      syncBuilderFromCompiledCourse(nextPreview.course);
    }

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }

    return nextPreview;
  }

  function applyBuilderCourse(
    nextBuilderCourse: BuilderCourse,
    nextFeedback?: FeedbackState | null,
    nextTemplateData: Record<string, TemplateScalarValue> = templateDataValues
  ): void {
    const nextSource = builderCourseToYaml(nextBuilderCourse, nextTemplateData);
    const nextPreview = compilePreview(nextSource, nextTemplateData);

    setBuilderCourse(nextBuilderCourse);
    setDraftYaml(nextSource);
    setDraftErrors(nextPreview.errors);
    clearLastExportedPackage();
    setActiveSampleId(null);
    setSourceLabel("Builder-generated source");

    startTransition(() => {
      setPreviewState(nextPreview);
    });

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

  function handleCompile(): void {
    const nextPreview = updatePreview(draftYaml, templateDataValues, undefined, true);
    clearLastExportedPackage();

    setFeedback(
      nextPreview.course
        ? {
            tone: "success",
            title: "Course validated",
            message:
              "Preview updated successfully. Blocks, placeholders, and branching paths are ready for export.",
          }
        : {
            tone: "error",
            title: "Validation failed",
            message:
              "Fix the YAML, template, or reference issues below, then validate again before previewing or exporting.",
          }
    );
  }

  function handleSelectSample(sample: CourseSample): void {
    const sampleTemplateData = parseTemplateDataYaml(sample.templateDataYaml);

    setActiveSampleId(sample.id);
    setAuthoringMode("builder");
    setDraftYaml(sample.yaml);
    setSourceLabel(`Sample template: ${sample.title}`);
    clearLastExportedPackage();

    setTemplateDataValues(sampleTemplateData);

    const nextTemplateDraft = inspectTemplateDraft(sample.yaml, sampleTemplateData);
    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    const nextPreview = updatePreview(sample.yaml, sampleTemplateData, {
      tone: "info",
      title: "Template loaded",
      message: `${sample.title} is loaded and previewed instantly so you can start experimenting right away.`,
    });

    syncBuilderFromCompiledCourse(nextPreview.course);
  }

  function handleResetToSelectedSample(): void {
    if (!selectedSample) {
      return;
    }

    const sampleTemplateData = parseTemplateDataYaml(selectedSample.templateDataYaml);

    setDraftYaml(selectedSample.yaml);
    setAuthoringMode("builder");
    setSourceLabel(`Sample template: ${selectedSample.title}`);
    clearLastExportedPackage();
    setTemplateDataValues(sampleTemplateData);

    const nextTemplateDraft = inspectTemplateDraft(
      selectedSample.yaml,
      sampleTemplateData
    );
    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    const nextPreview = updatePreview(selectedSample.yaml, sampleTemplateData, {
      tone: "info",
      title: "Template reset",
      message: `${selectedSample.title} has been restored to its default YAML and template values.`,
    });

    syncBuilderFromCompiledCourse(nextPreview.course);
  }

  function handleResetDemo(): void {
    clearAllRuntimeStates();
    clearLastExportedPackage();
    setActiveSampleId(defaultSample.id);
    setDraftYaml(defaultSample.yaml);
    setSourceLabel(`Sample template: ${defaultSample.title}`);
    setIsAuthoringGuideOpen(false);
    setFeedback({
      tone: "info",
      title: "Demo reset",
      message:
        "The default template, preview state, and saved demo walkthrough state have been reset.",
    });

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_WALKTHROUGH_STORAGE_KEY);
    }

    const nextTemplateDraft = inspectTemplateDraft(
      defaultSample.yaml,
      defaultTemplateData
    );
    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    setTemplateDataValues(defaultTemplateData);

    const nextPreview = updatePreview(defaultSample.yaml, defaultTemplateData);
    syncBuilderFromCompiledCourse(nextPreview.course);
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
    clearLastExportedPackage();
    setSourceLabel("Custom source draft");

    const nextTemplateData = syncTemplateDraft(source, true);
    setDraftErrors(collectDraftValidationErrors(source, nextTemplateData));
  }

  function handleTemplateDataChange(
    key: string,
    value: TemplateScalarValue
  ): void {
    const nextTemplateData = {
      ...templateDataValues,
      [key]: value,
    };

    setTemplateDataValues(nextTemplateData);
    clearLastExportedPackage();
    setDraftErrors(collectDraftValidationErrors(draftYaml, nextTemplateData));

    if (authoringMode === "builder") {
      applyBuilderCourse(builderCourse, {
        tone: "info",
        title: "Template variables updated",
        message: "The builder source and compiled preview were regenerated from the latest template values.",
      }, nextTemplateData);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedYaml = await file.text();
      const nextTemplateDraft = inspectTemplateDraft(uploadedYaml, templateDataValues);

      setActiveSampleId(null);
      setDraftYaml(uploadedYaml);
      setSourceLabel(`Uploaded file: ${file.name}`);
      clearLastExportedPackage();
      setAuthoringMode("source");

      if (nextTemplateDraft) {
        setTemplateFields(nextTemplateDraft.fields);
      }

      const nextPreview = updatePreview(uploadedYaml, templateDataValues, undefined, true);
      setFeedback(
        nextPreview.course
          ? {
              tone: "success",
              title: "YAML file loaded",
              message: `${file.name} validated successfully and is ready for preview or export.`,
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
      const nextTemplateDraft = inspectTemplateDraft(draftYaml, uploadedTemplateData);

      setTemplateDataValues(uploadedTemplateData);

      if (nextTemplateDraft) {
        setTemplateFields(nextTemplateDraft.fields);
      }

      const nextPreview = updatePreview(
        draftYaml,
        uploadedTemplateData,
        {
          tone: "success",
          title: "Template data imported",
          message: `${file.name} was applied to the current source definition.`,
        },
        authoringMode !== "builder"
      );

      if (authoringMode === "builder" && nextPreview.course) {
        syncBuilderFromCompiledCourse(nextPreview.course);
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
    const nextPreview = updatePreview(
      draftYaml,
      templateDataValues,
      undefined,
      true
    );

    if (!nextPreview.course) {
      setFeedback({
        tone: "error",
        title: "Builder sync failed",
        message:
          "Fix the current source issues first, then sync the builder from the validated source definition.",
      });
      return;
    }

    setAuthoringMode("builder");
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
      previewState.course?.id ?? selectedSample?.id ?? "course-variant"
    );

    downloadTextFile(
      buildSourceDownloadFileName(projectDirectory, "course"),
      draftYaml
    );
  }

  function handleDownloadTemplateData(): void {
    const projectDirectory = inferCourseProjectDirectory(
      draftYaml,
      previewState.course?.id ?? selectedSample?.id ?? "course-variant"
    );

    downloadTextFile(
      buildSourceDownloadFileName(projectDirectory, "template-data"),
      serializeTemplateDataYaml(templateDataValues)
    );
  }

  function handleDownloadSourceReadme(): void {
    const projectDirectory = inferCourseProjectDirectory(
      draftYaml,
      previewState.course?.id ?? selectedSample?.id ?? "course-variant"
    );
    const title = previewState.course?.title ?? selectedSample?.title ?? "Course Variant";
    const templateName =
      selectedSample?.templateDirectory ?? previewState.course?.id ?? "custom-template";

    downloadTextFile(
      `${projectDirectory}-README.md`,
      buildCourseProjectReadme({
        title,
        templateName,
        projectDirectory,
      })
    );
  }

  function handleDuplicateTemplate(): void {
    if (!selectedSample) {
      return;
    }

    const duplicatedDraft = createDuplicatedTemplateDraft({
      courseYaml: draftYaml,
      templateData: templateDataValues,
      templateTitle: selectedSample.title,
      fallbackDirectory: selectedSample.courseDirectory,
    });

    setActiveSampleId(null);
    setDraftYaml(duplicatedDraft.courseYaml);
    setSourceLabel(duplicatedDraft.sourceLabel);
    clearLastExportedPackage();
    setAuthoringMode("builder");

    const nextPreview = updatePreview(
      duplicatedDraft.courseYaml,
      duplicatedDraft.templateData,
      {
        tone: "success",
        title: "Template duplicated",
        message: `You now have a local source variant. Suggested project folder: ${duplicatedDraft.suggestedProjectDirectory}.`,
      },
      true
    );

    const nextTemplateDraft = inspectTemplateDraft(
      duplicatedDraft.courseYaml,
      duplicatedDraft.templateData
    );

    if (nextTemplateDraft) {
      setTemplateFields(nextTemplateDraft.fields);
    }

    setTemplateDataValues(duplicatedDraft.templateData);

    if (nextPreview.course) {
      syncBuilderFromCompiledCourse(nextPreview.course);
    }
  }

  async function handleExport(): Promise<void> {
    if (!previewState.course) {
      return;
    }

    setIsExporting(true);
    trackClientEvent(
      "export_attempted",
      {
        courseId: previewState.course.id,
        courseTitle: previewState.course.title,
      },
      "studio"
    );

    try {
      const blob = await exportCourseAsScormZip(previewState.course);
      const fileName = buildScormFileName(previewState.course);
      const objectUrl = window.URL.createObjectURL(blob);

      clearLastExportedPackage();
      exportObjectUrlRef.current = objectUrl;
      setLastExportedPackage({
        fileName,
        objectUrl,
        contents: SCORM_PACKAGE_CONTENTS,
      });
      downloadPackage(fileName, objectUrl);

      setFeedback({
        tone: "success",
        title: "SCORM 1.2 package generated successfully.",
        message: "Download the package or inspect the generated file structure.",
      });
    } catch (error) {
      clearLastExportedPackage();
      setFeedback({
        tone: "error",
        title: "Export failed",
        message:
          error instanceof Error
            ? error.message
            : "The SCORM package could not be generated.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  const walkthroughSteps = [
    {
      targetRef: templateSelectorRef,
      title: "Start with a training template.",
      description:
        "Choose a scenario shell for security, compliance, or customer service and the preview will load automatically.",
    },
    {
      targetRef: yamlEditorRef,
      title: "Edit the scenario structure in YAML.",
      description:
        "Change the nodes, branching paths, and placeholder values directly in YAML while keeping the course structure transparent.",
    },
    {
      targetRef: previewPanelRef,
      title: "Preview the training flow instantly.",
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
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Structured Training Authoring</p>
          <h1>
            Build structured course source, compile a preview, and export SCORM
            from the same definition.
          </h1>
          <p className="hero-subheadline">
            Use guided forms or direct YAML to author repeatable interactive
            training modules without switching away from a structured source model.
          </p>
          <WorkflowSteps steps={["Source", "Compile", "Preview", "SCORM"]} />
          <p className="hero-copy">
            Choose a template, edit source files or builder fields, validate the
            structure, preview the compiled runtime, and export a SCORM build.
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

      <section className="workbench-grid">
        <div className="panel editor-panel">
          <div className="panel-section" ref={templateSelectorRef}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Sample Templates</p>
                <p className="panel-copy section-copy">
                  Start with a structured scenario, see the preview update
                  instantly, and then tailor the YAML to your use case.
                </p>
              </div>
              <button
                className="ghost-button"
                onClick={handleResetDemo}
                type="button"
              >
                Reset Demo
              </button>
            </div>
            <div className="template-grid">
              {samples.map((sample) => (
                <button
                  className={`template-card ${
                    activeSampleId === sample.id ? "template-card-active" : ""
                  }`}
                  aria-pressed={activeSampleId === sample.id}
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  type="button"
                >
                  <div className="template-card-header">
                    <span className="template-pill">
                      {activeSampleId === sample.id ? "Selected template" : "Template"}
                    </span>
                    <span className="scenario-pill">{sample.scenarioType}</span>
                  </div>
                  <strong>{sample.title}</strong>
                  <span>{sample.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <p className="eyebrow">Template Variables</p>
            <h2>Quick-edit compile-time variables</h2>
            <p className="panel-copy section-copy">
              These values are applied at compile time before preview and export.
              Builder mode and Source view both compile from the same structured
              definition.
            </p>
            <TemplateDataEditor
              fields={templateFields}
              onChange={handleTemplateDataChange}
              values={templateDataValues}
            />
          </div>

          <section className="panel repeatable-workflow-panel">
            <p className="eyebrow">Built for Repeatable Workflows</p>
            <h2>Structured source stays in control</h2>
            <p className="panel-copy">
              This studio is designed for reusable templates, source files that
              work well in Git, and repeatable SCORM generation. The builder is a
              convenience layer on top of the same source model.
            </p>
          </section>

          <div className="panel-header">
            <div>
              <p className="eyebrow">Authoring Workflow</p>
              <h2>{authoringMode === "builder" ? "Course Builder" : "Course Source"}</h2>
              <p className="panel-copy">
                {authoringMode === "builder"
                  ? "Use forms to build the source definition, then switch to Source view any time to inspect or edit the YAML directly."
                  : "Keep the YAML as the source of truth. Validation covers schema shape, variables, layouts, and branching integrity."}
              </p>
              <button
                className="inline-link-button"
                onClick={openAuthoringGuide}
                type="button"
              >
                Authoring Guide
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
                Import template data
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
                Download template data
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
                disabled={!selectedSample}
                onClick={handleDuplicateTemplate}
                type="button"
              >
                Duplicate template
              </button>
              <button
                className="ghost-button"
                disabled={!selectedSample}
                onClick={handleResetToSelectedSample}
                type="button"
              >
                Reset to source defaults
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
                  <strong>Theme:</strong> Theme values compile into the browser
                  preview and SCORM runtime, so colors, font, logo, and background
                  live with the same source definition.
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
                ? "Source or variables changed since the last compile"
                : "Compiled preview is in sync with source"}
            </span>
          </div>

          {authoringMode === "builder" ? (
            <div ref={yamlEditorRef}>
              <CourseBuilder
                course={builderCourse}
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
              <h3>YAML issues to fix</h3>
              <p className="panel-copy">
                These messages update from the current draft, so you can catch
                syntax, missing nodes, and broken branching references before you
                export anything.
              </p>
              <ValidationIssueList issues={displayedValidationErrors} />
            </div>
          ) : null}

          <div className="export-bar">
            <div>
              <p className="eyebrow">Export Build</p>
              <h3>Build SCORM 1.2 package</h3>
              <p className="panel-copy">
                Validated source definitions export as downloadable SCORM 1.2 zip
                packages. Build after the compiled preview is in sync.
              </p>
            </div>
            <button
              className="primary-button export-button"
              disabled={!isReadyToExport || isExporting}
              onClick={() => void handleExport()}
              type="button"
            >
              {isExporting ? "Building..." : "Export SCORM 1.2"}
            </button>
          </div>

          {lastExportedPackage ? (
            <section className="panel export-result-panel">
              <div className="export-result-header">
                <div>
                  <p className="eyebrow">Generated Package</p>
                  <h3>SCORM 1.2 package generated successfully.</h3>
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
                    Download SCORM package
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
                  <p className="eyebrow">SCORM Package Contents</p>
                  <ul className="package-contents-list">
                    {lastExportedPackage.contents.map((filePath) => (
                      <li key={filePath}>{filePath}</li>
                    ))}
                  </ul>
                  <div className="export-test-notes">
                    <strong>Export test notes</strong>
                    <p className="panel-copy">
                      After export, test import, launch, score reporting, and resume
                      behavior in your target LMS before treating the package as ready
                      for production.
                    </p>
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
                <code>templateData</code> during compilation.
              </p>
            </div>
          </details>

          <details className="details-panel">
            <summary>View compiled source document</summary>
            <pre className="json-preview">
              {previewState.expandedCourseJson ||
                "Compile the source to inspect the resolved document."}
            </pre>
          </details>

          <details className="details-panel">
            <summary>View normalized runtime graph</summary>
            <pre className="json-preview">
              {previewState.compiledJson ||
                "Compile the source to inspect the normalized runtime graph."}
            </pre>
          </details>
        </div>

        <div className="preview-column">
          <section className="panel preview-cta-panel">
            <div>
              <p className="eyebrow">Compile Workflow</p>
              <h2>{"Source definition -> compiled preview -> export build"}</h2>
              <p className="panel-copy">
                {isReadyToExport
                  ? "The compiled source is validated and ready to package as SCORM 1.2."
                  : "Keep the compiled preview in sync with the latest source definition and variables before exporting."}
              </p>
            </div>
            <button
              className="primary-button export-button"
              disabled={!isReadyToExport || isExporting}
              onClick={() => void handleExport()}
              ref={exportButtonRef}
              type="button"
            >
              {isExporting ? "Building..." : "Export SCORM 1.2"}
            </button>
          </section>

          <div ref={previewPanelRef}>
            {previewState.course ? (
              <RuntimePlayer course={previewState.course} />
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
            <p className="eyebrow">Structure Inspector</p>
            <h2>Typed source summary</h2>
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
        </div>
      </section>

      <GuidedWalkthrough
        key={tourInstanceKey}
        steps={walkthroughSteps}
        storageKey={DEMO_WALKTHROUGH_STORAGE_KEY}
      />
    </main>
  );
}
