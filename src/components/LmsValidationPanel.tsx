"use client";

import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface LmsValidationPanelProps {
  catalog: LmsValidationCatalog;
}

export function LmsValidationPanel({ catalog }: LmsValidationPanelProps) {
  return (
    <section className="panel notes-panel">
      <p className="eyebrow">LMS Validation</p>
      <h2>SCORM Cloud passed, broader LMS testing in progress</h2>
      <p className="panel-copy">{catalog.summary}</p>
      <div className="validation-state-grid">
        {catalog.checklist.map((item) => (
          <span className="status-pill" key={item}>
            {item}
          </span>
        ))}
      </div>
      <div className="lms-validation-grid">
        {catalog.targets.map((target) => (
          <article className="runtime-status-card lms-validation-card" key={target.id}>
            <span className="runtime-status-label">{target.name}</span>
            <strong>
              {target.validationDate ? target.validationDate : "Pending manual validation"}
            </strong>
            <div className="validation-state-grid">
              <span className={`status-pill ${target.importPassed ? "status-ready" : "status-warn"}`}>
                Import
              </span>
              <span className={`status-pill ${target.launchPassed ? "status-ready" : "status-warn"}`}>
                Launch
              </span>
              <span
                className={`status-pill ${
                  target.completionPassed ? "status-ready" : "status-warn"
                }`}
              >
                Completion
              </span>
              <span className={`status-pill ${target.scorePassed ? "status-ready" : "status-warn"}`}>
                Score
              </span>
              <span
                className={`status-pill ${
                  target.passFailPassed ? "status-ready" : "status-warn"
                }`}
              >
                Pass/fail
              </span>
              <span className={`status-pill ${target.resumePassed ? "status-ready" : "status-warn"}`}>
                Resume
              </span>
            </div>
            <p className="panel-copy">
              {target.version ? `Version: ${target.version}. ` : ""}
              {target.notes || "Record LMS-specific notes in docs/lms-validation.yaml."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
