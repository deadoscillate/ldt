"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";

import { RuntimePlayer } from "@/components/RuntimePlayer";
import { TemplateDataEditor } from "@/components/TemplateDataEditor";
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
} from "@/lib/export/scorm-export";

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

function templateFieldsToValues(
  fields: TemplateFieldDefinition[]
): Record<string, TemplateScalarValue> {
  return Object.fromEntries(fields.map((field) => [field.key, field.value]));
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

export function CourseWorkbench({ samples }: CourseWorkbenchProps) {
  const defaultSample = samples[0];
  const defaultTemplateDraft = inspectTemplateDraft(defaultSample.yaml) ?? {
    fields: [],
    values: {},
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draftYaml, setDraftYaml] = useState(defaultSample.yaml);
  const [templateFields, setTemplateFields] = useState(defaultTemplateDraft.fields);
  const [templateDataValues, setTemplateDataValues] = useState(
    defaultTemplateDraft.values
  );
  const [previewState, setPreviewState] = useState<PreviewState>(() =>
    compilePreview(defaultSample.yaml, defaultTemplateDraft.values)
  );
  const [activeSampleId, setActiveSampleId] = useState<string | null>(
    defaultSample.id
  );
  const [sourceLabel, setSourceLabel] = useState(
    `Sample template: ${defaultSample.title}`
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const selectedSample =
    samples.find((sample) => sample.id === activeSampleId) ?? null;
  const hasUncompiledChanges =
    draftYaml !== previewState.source ||
    serializeTemplateData(templateDataValues) !== previewState.templateDataFingerprint;
  const isReadyToExport = Boolean(previewState.course) && !hasUncompiledChanges;

  function syncTemplateDraft(
    source: string
  ): Record<string, TemplateScalarValue> {
    const nextTemplateDraft = inspectTemplateDraft(source);

    if (!nextTemplateDraft) {
      return templateDataValues;
    }

    setTemplateFields(nextTemplateDraft.fields);
    setTemplateDataValues(nextTemplateDraft.values);
    return nextTemplateDraft.values;
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

    if (nextFeedback !== undefined) {
      setFeedback(nextFeedback);
    }

    return nextPreview;
  }

  function handleCompile(): void {
    const nextPreview = compilePreview(draftYaml, templateDataValues);

    startTransition(() => {
      setPreviewState(nextPreview);
    });

    setFeedback(
      nextPreview.course
        ? {
            tone: "success",
            title: "Course validated",
            message:
              "Blocks and placeholders were expanded successfully. The course is ready to preview or export as SCORM 1.2.",
          }
        : {
            tone: "error",
            title: "Validation failed",
            message:
              "Fix the YAML, block, or placeholder issues below, then validate again before previewing or exporting.",
          }
    );
  }

  function handleSelectSample(sample: CourseSample): void {
    setActiveSampleId(sample.id);
    setDraftYaml(sample.yaml);
    setSourceLabel(`Sample template: ${sample.title}`);

    const nextTemplateData = syncTemplateDraft(sample.yaml);

    updatePreview(sample.yaml, nextTemplateData, {
      tone: "info",
      title: "Template loaded",
      message: `${sample.title} is ready to customize, preview, and export.`,
    });
  }

  function handleResetToSelectedSample(): void {
    if (!selectedSample) {
      return;
    }

    setDraftYaml(selectedSample.yaml);
    setSourceLabel(`Sample template: ${selectedSample.title}`);

    const nextTemplateData = syncTemplateDraft(selectedSample.yaml);

    updatePreview(selectedSample.yaml, nextTemplateData, {
      tone: "info",
      title: "Template reset",
      message: `${selectedSample.title} has been restored to its sample YAML and default template data.`,
    });
  }

  function handleYamlChange(source: string): void {
    setDraftYaml(source);
    syncTemplateDraft(source);
  }

  function handleTemplateDataChange(
    key: string,
    value: TemplateScalarValue
  ): void {
    setTemplateDataValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
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

      const nextTemplateData = syncTemplateDraft(uploadedYaml);
      const nextPreview = compilePreview(uploadedYaml, nextTemplateData);

      startTransition(() => {
        setPreviewState(nextPreview);
      });

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
                "The file was loaded, but blocks, placeholders, or schema rules did not validate. Review the inline errors below.",
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
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      link.click();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 0);

      setFeedback({
        tone: "success",
        title: "SCORM package downloaded",
        message: `${fileName} was generated from the expanded and validated course definition.`,
      });
    } catch (error) {
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
            <span>Expand blocks at compile time and run the course in the browser.</span>
          </div>
          <div className="summary-card">
            <strong>Export</strong>
            <span>Generate a SCORM 1.2 zip from the validated compiled output.</span>
          </div>
        </div>
      </section>

      <section className="workbench-grid">
        <div className="panel editor-panel">
          <div className="panel-section">
            <p className="eyebrow">Sample Templates</p>
            <p className="panel-copy section-copy">
              Start with one of the reusable scenario templates and adapt its
              placeholder values for your training module.
            </p>
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
                  <span className="template-pill">
                    {activeSampleId === sample.id ? "Selected template" : "Template"}
                  </span>
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

          <div className="panel-header">
            <div>
              <p className="eyebrow">Authoring</p>
              <h2>Paste or upload YAML</h2>
              <p className="panel-copy">
                Keep the YAML as the source of truth. Validation errors cover block
                expansion, placeholder interpolation, and scene graph integrity.
              </p>
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

          <YamlEditor
            onChange={handleYamlChange}
            placeholder="Paste course YAML here..."
            value={draftYaml}
          />

          {feedback ? (
            <div className={`feedback-banner feedback-${feedback.tone}`}>
              <strong>{feedback.title}</strong>
              <span>{feedback.message}</span>
            </div>
          ) : null}

          {previewState.errors.length > 0 ? (
            <div className="error-panel">
              <h3>YAML issues to fix</h3>
              <p className="panel-copy">
                The course did not pass template expansion, schema validation, or
                compilation checks. Fix the items below, then validate again.
              </p>
              <ul>
                {previewState.errors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
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
              type="button"
            >
              {isExporting ? "Exporting..." : "Export SCORM 1.2"}
            </button>
          </section>

          {previewState.course ? (
            <RuntimePlayer course={previewState.course} />
          ) : (
            <section className="panel runtime-panel placeholder-panel">
              <p className="eyebrow">Preview</p>
              <h2>Preview unavailable</h2>
              <p className="panel-copy">
                Validate the YAML successfully to expand reusable blocks, preview
                the learner experience, and unlock SCORM export.
              </p>
            </section>
          )}

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
    </main>
  );
}
