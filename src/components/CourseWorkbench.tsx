"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";

import { GuidedWalkthrough } from "@/components/GuidedWalkthrough";
import { RuntimePlayer } from "@/components/RuntimePlayer";
import { TemplateDataEditor } from "@/components/TemplateDataEditor";
import { ValidationIssueList } from "@/components/ValidationIssueList";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { YamlEditor } from "@/components/YamlEditor";
import { serializeCompiledCourse } from "@/lib/course/compile";
import {
  collectCourseErrorMessages,
  inspectTemplateFields,
  parseAndCompileCourseBundle,
} from "@/lib/course/parse";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { TemplateScalarValue } from "@/lib/course/schema";
import type { TemplateFieldDefinition } from "@/lib/course/template";
import type { CompiledCourse } from "@/lib/course/types";
import {
  buildScormFileName,
  exportCourseAsScormZip,
  SCORM_PACKAGE_CONTENTS,
} from "@/lib/export/scorm-export";
import { clearAllRuntimeStates } from "@/lib/runtime/storage";

interface CourseWorkbenchProps {
  samples: CourseSample[];
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

function inspectTemplateDraft(source: string): TemplateDraftState | null {
  const fields = inspectTemplateFields(source);

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

export function CourseWorkbench({ samples }: CourseWorkbenchProps) {
  const defaultSample = samples[0];
  const defaultTemplateDraft = inspectTemplateDraft(defaultSample.yaml) ?? {
    fields: [],
    values: {},
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [lastExportedPackage, setLastExportedPackage] =
    useState<ExportedPackageState | null>(null);
  const [isPackageViewerOpen, setIsPackageViewerOpen] = useState(false);
  const [isAuthoringGuideOpen, setIsAuthoringGuideOpen] = useState(false);
  const [tourInstanceKey, setTourInstanceKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const selectedSample =
    samples.find((sample) => sample.id === activeSampleId) ?? null;
  const hasUncompiledChanges =
    draftYaml !== previewState.source ||
    serializeTemplateData(templateDataValues) !== previewState.templateDataFingerprint;
  const displayedValidationErrors = hasUncompiledChanges
    ? draftErrors
    : previewState.errors;
  const isReadyToExport = Boolean(previewState.course) && !hasUncompiledChanges;

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
    const nextTemplateDraft = inspectTemplateDraft(source);

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

  function updatePreview(
    source: string,
    nextTemplateData: Record<string, TemplateScalarValue>,
    nextFeedback?: FeedbackState | null
  ): PreviewState {
    const nextPreview = compilePreview(source, nextTemplateData);

    startTransition(() => {
      setPreviewState(nextPreview);
    });

    setDraftErrors(nextPreview.errors);

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }

    return nextPreview;
  }

  function openAuthoringGuide(): void {
    setIsAuthoringGuideOpen(true);
    authoringGuideRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleCompile(): void {
    const nextPreview = compilePreview(draftYaml, templateDataValues);

    startTransition(() => {
      setPreviewState(nextPreview);
    });

    setDraftErrors(nextPreview.errors);
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
    setActiveSampleId(sample.id);
    setDraftYaml(sample.yaml);
    setSourceLabel(`Sample template: ${sample.title}`);
    clearLastExportedPackage();

    const nextTemplateData = syncTemplateDraft(sample.yaml, false);

    updatePreview(sample.yaml, nextTemplateData, {
      tone: "info",
      title: "Template loaded",
      message: `${sample.title} is loaded and previewed instantly so you can start experimenting right away.`,
    });
  }

  function handleResetToSelectedSample(): void {
    if (!selectedSample) {
      return;
    }

    setDraftYaml(selectedSample.yaml);
    setSourceLabel(`Sample template: ${selectedSample.title}`);
    clearLastExportedPackage();

    const nextTemplateData = syncTemplateDraft(selectedSample.yaml, false);

    updatePreview(selectedSample.yaml, nextTemplateData, {
      tone: "info",
      title: "Template reset",
      message: `${selectedSample.title} has been restored to its default YAML and template values.`,
    });
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

    const nextTemplateData = syncTemplateDraft(defaultSample.yaml, false);
    updatePreview(defaultSample.yaml, nextTemplateData);
    setTourInstanceKey((currentValue) => currentValue + 1);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleYamlChange(source: string): void {
    setDraftYaml(source);
    clearLastExportedPackage();

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
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedYaml = await file.text();

      setActiveSampleId(null);
      setDraftYaml(uploadedYaml);
      setSourceLabel(`Uploaded file: ${file.name}`);
      clearLastExportedPackage();

      const nextTemplateData = syncTemplateDraft(uploadedYaml, false);
      const nextPreview = compilePreview(uploadedYaml, nextTemplateData);

      startTransition(() => {
        setPreviewState(nextPreview);
      });

      setDraftErrors(nextPreview.errors);
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

  async function handleExport(): Promise<void> {
    if (!previewState.course) {
      return;
    }

    setIsExporting(true);

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
          <p className="eyebrow">SCORM Course Engine</p>
          <h1>
            Write branching training modules in YAML and export them as SCORM
            packages.
          </h1>
          <p className="hero-subheadline">
            Build branching training scenarios in minutes and export
            standards-compliant SCORM packages for any LMS.
          </p>
          <WorkflowSteps steps={["YAML", "Preview", "SCORM", "LMS"]} />
          <p className="hero-copy">
            Choose a template, adjust reusable placeholder values, review the
            YAML, validate the expanded course, and download a SCORM 1.2 package.
          </p>
        </div>
        <div className="hero-summary">
          <div className="summary-card">
            <strong>Template</strong>
            <span>Select a reusable scenario shell and edit its template data.</span>
          </div>
          <div className="summary-card">
            <strong>Preview</strong>
            <span>Expand blocks at compile time and run the course directly in the browser.</span>
          </div>
          <div className="summary-card">
            <strong>Export</strong>
            <span>Generate a SCORM 1.2 zip from the validated compiled output.</span>
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
            <p className="eyebrow">Template Data</p>
            <h2>Quick-edit placeholder values</h2>
            <p className="panel-copy section-copy">
              These values are applied at compile time before preview and export.
              The YAML remains visible below for direct editing.
            </p>
            <TemplateDataEditor
              fields={templateFields}
              onChange={handleTemplateDataChange}
              values={templateDataValues}
            />
          </div>

          <div className="panel-header">
            <div>
              <p className="eyebrow">Authoring</p>
              <h2>Paste or upload YAML</h2>
              <p className="panel-copy">
                Keep the YAML as the source of truth. Validation errors cover
                syntax, block expansion, placeholder interpolation, and branching
                integrity.
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
              <button
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload YAML
              </button>
              <button
                className="ghost-button"
                disabled={!selectedSample}
                onClick={handleResetToSelectedSample}
                type="button"
              >
                Reset to sample
              </button>
              <button className="primary-button" onClick={handleCompile} type="button">
                {isPending ? "Validating..." : "Validate & preview"}
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
                Start with top-level course metadata, add nodes in order, and use
                branching targets like <code>next</code>, <code>passNext</code>,
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
                  <strong>Node types:</strong> Use <code>content</code> for
                  context, <code>choice</code> for branching, <code>quiz</code>{" "}
                  for scored knowledge checks, and <code>result</code> for the end
                  screen.
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
                ? "YAML or template data changed since last validation"
                : "Validated preview is in sync"}
            </span>
          </div>

          <div ref={yamlEditorRef}>
            <YamlEditor
              onChange={handleYamlChange}
              placeholder="Paste course YAML here..."
              value={draftYaml}
            />
          </div>

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
              <p className="eyebrow">Export</p>
              <h3>Export SCORM 1.2</h3>
              <p className="panel-copy">
                Validated courses export as downloadable SCORM 1.2 zip packages.
                Export after the expanded preview is in sync.
              </p>
            </div>
            <button
              className="primary-button export-button"
              disabled={!isReadyToExport || isExporting}
              onClick={() => void handleExport()}
              type="button"
            >
              {isExporting ? "Exporting..." : "Export SCORM 1.2"}
            </button>
          </div>

          {lastExportedPackage ? (
            <section className="panel export-result-panel">
              <div className="export-result-header">
                <div>
                  <p className="eyebrow">Generated Package</p>
                  <h3>SCORM 1.2 package generated successfully.</h3>
                  <p className="panel-copy">
                    Download the package again or inspect the generated file
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
            <summary>View expanded course document</summary>
            <pre className="json-preview">
              {previewState.expandedCourseJson ||
                "Validate a course to inspect the block-expanded document."}
            </pre>
          </details>

          <details className="details-panel">
            <summary>View compiled scene graph</summary>
            <pre className="json-preview">
              {previewState.compiledJson ||
                "Validate a course to inspect the normalized scene graph."}
            </pre>
          </details>
        </div>

        <div className="preview-column">
          <section className="panel preview-cta-panel">
            <div>
              <p className="eyebrow">Workflow</p>
              <h2>Expand, preview, then export</h2>
              <p className="panel-copy">
                {isReadyToExport
                  ? "The expanded course is validated and ready to package as SCORM 1.2."
                  : "Keep the preview in sync with the latest YAML and template data before exporting."}
              </p>
            </div>
            <button
              className="primary-button export-button"
              disabled={!isReadyToExport || isExporting}
              onClick={() => void handleExport()}
              ref={exportButtonRef}
              type="button"
            >
              {isExporting ? "Exporting..." : "Export SCORM 1.2"}
            </button>
          </section>

          <div ref={previewPanelRef}>
            {previewState.course ? (
              <RuntimePlayer course={previewState.course} />
            ) : (
              <section className="panel runtime-panel placeholder-panel">
                <p className="eyebrow">Preview</p>
                <h2>Preview unavailable</h2>
                <p className="panel-copy">
                  Validate the YAML successfully to expand reusable blocks,
                  preview the learner experience, and unlock SCORM export.
                </p>
              </section>
            )}
          </div>

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
