import Link from "next/link";

import { ProofSummaryCard } from "@/components/ProofSummaryCard";
import { ValidationStatusBadge } from "@/components/ValidationStatusBadge";
import {
  VALIDATION_BEHAVIOR_LABELS,
  buildPlatformProofSummary,
  getLatestValidationRecord,
  getPlatformValidationStatus,
} from "@/lib/validation/proof";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface ValidationProofCenterProps {
  catalog: LmsValidationCatalog;
}

function formatValidationDate(value: string): string {
  if (!value) {
    return "No dated record yet";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(parsedDate);
}

export function ValidationProofCenter({
  catalog,
}: ValidationProofCenterProps) {
  return (
    <main className="landing-shell proof-center-shell">
      <header className="landing-nav">
        <Link className="brand-link" href="/">
          LDT Engine
        </Link>
        <nav className="landing-nav-links" aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/validation">Validation</Link>
          <Link href="/studio">Studio</Link>
          <Link className="primary-button button-link" href="/studio">
            Open Studio
          </Link>
        </nav>
      </header>

      <section className="landing-hero proof-center-hero">
        <div className="hero-copy-block landing-hero-copy">
          <p className="eyebrow">Validation</p>
          <h1>Proof center for SCORM interoperability and LMS validation status</h1>
          <p className="hero-subheadline">{catalog.summary}</p>
          <p className="hero-copy">{catalog.philosophy}</p>
          <div className="proof-status-band" aria-label="Current platform validation summary">
            {catalog.platforms.map((platform) => {
              const summary = buildPlatformProofSummary(platform);

              return (
                <article className="summary-card proof-status-card" key={platform.id}>
                  <strong>{platform.name}</strong>
                  <ValidationStatusBadge status={summary.status} />
                  <span>
                    {summary.latestValidationDate
                      ? `Latest record: ${formatValidationDate(summary.latestValidationDate)}`
                      : "No dated validation record yet"}
                  </span>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="panel landing-hero-panel">
          <p className="eyebrow">Current beta scope</p>
          <h2>Source-driven authoring with visible validation evidence</h2>
          <ul className="beta-scope-list">
            {catalog.betaScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="landing-section">
        <ProofSummaryCard catalog={catalog} />
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Validation philosophy</p>
          <h2>Proof is tracked separately from source and build output</h2>
          <p className="panel-copy">
            Source YAML remains the system of record. SCORM packages remain build
            artifacts. LMS validation records document what has actually been tested.
          </p>
        </div>

        <div className="feature-grid">
          {catalog.caveats.map((item) => (
            <article className="panel feature-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Validation checklist</p>
          <h2>Behaviors recorded for each platform</h2>
          <p className="panel-copy">
            Every platform record uses the same checklist so results stay comparable
            across SCORM Cloud, Moodle, Canvas LMS, and TalentLMS.
          </p>
        </div>
        <div className="proof-checklist" aria-label="Validation checklist">
          {catalog.checklist.map((item) => (
            <span className="proof-item" key={item}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Platform records</p>
          <h2>Latest validation results by LMS</h2>
          <p className="panel-copy">
            These records show what has been tested, which build mode was used, and
            what still needs broader LMS confirmation.
          </p>
        </div>
        <div className="proof-platform-list">
          {catalog.platforms.map((platform) => {
            const latestRecord = getLatestValidationRecord(platform);

            return (
              <article className="panel proof-platform-panel" key={platform.id}>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">{platform.name}</p>
                    <h2>{platform.summary || "Validation record"}</h2>
                    <p className="panel-copy">
                      Latest validation date: {formatValidationDate(latestRecord.validationDate)}
                    </p>
                  </div>
                  <ValidationStatusBadge status={getPlatformValidationStatus(platform)} />
                </div>

                <div className="runtime-status-grid inspector-grid">
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">Course</span>
                    <strong>{latestRecord.courseName || "Not recorded yet"}</strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">Package</span>
                    <strong>{latestRecord.packageName || "Not recorded yet"}</strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">Export mode</span>
                    <strong>{latestRecord.exportMode}</strong>
                  </div>
                  <div className="runtime-status-card">
                    <span className="runtime-status-label">Diagnostics</span>
                    <strong>{latestRecord.diagnosticsEnabled ? "Enabled" : "Disabled"}</strong>
                  </div>
                </div>

                <div className="validation-state-grid">
                  {(
                    Object.entries(latestRecord.behaviors) as Array<
                      [keyof typeof VALIDATION_BEHAVIOR_LABELS, (typeof latestRecord.behaviors)[keyof typeof latestRecord.behaviors]]
                    >
                  ).map(([behaviorKey, status]) => (
                    <span className="status-pill validation-behavior-pill" key={behaviorKey}>
                      {VALIDATION_BEHAVIOR_LABELS[behaviorKey]}:{" "}
                      <strong>{status.replace("_", " ")}</strong>
                    </span>
                  ))}
                </div>

                <details className="details-panel">
                  <summary>View validation details</summary>
                  <div className="details-copy">
                    <div className="runtime-status-grid inspector-grid">
                      <div className="runtime-status-card">
                        <span className="runtime-status-label">Environment</span>
                        <strong>{latestRecord.environment || "Not recorded"}</strong>
                      </div>
                      <div className="runtime-status-card">
                        <span className="runtime-status-label">Version</span>
                        <strong>{latestRecord.version || "Not recorded"}</strong>
                      </div>
                      <div className="runtime-status-card">
                        <span className="runtime-status-label">Validator</span>
                        <strong>{latestRecord.validatorName || "Not recorded"}</strong>
                      </div>
                      <div className="runtime-status-card">
                        <span className="runtime-status-label">Source</span>
                        <strong>{latestRecord.validatorSource || "Not recorded"}</strong>
                      </div>
                    </div>
                    <p className="panel-copy">
                      {latestRecord.notes || "No additional notes recorded for this validation record."}
                    </p>
                    <div className="known-issues-panel">
                      <p className="eyebrow">Known issues and caveats</p>
                      {latestRecord.knownIssues.length > 0 ? (
                        <ul className="beta-scope-list">
                          {latestRecord.knownIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="panel-copy">No known issues are recorded for this record.</p>
                      )}
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section">
        <article className="panel trust-panel">
          <p className="eyebrow">Recommended wording</p>
          <h2>Use trust language that matches the evidence</h2>
          <p className="panel-copy">
            Validated in SCORM Cloud for launch, completion, score, pass/fail, and
            resume. Broader LMS interoperability testing is in progress.
          </p>
          <p className="panel-copy">
            Avoid claiming that the package works in every LMS unless the target
            platform has a dated validation record in this proof center.
          </p>
        </article>
      </section>
    </main>
  );
}
