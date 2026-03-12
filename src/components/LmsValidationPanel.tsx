"use client";

import Link from "next/link";

import { ValidationStatusBadge } from "@/components/ValidationStatusBadge";
import {
  buildPlatformProofSummary,
  getLatestValidationRecord,
} from "@/lib/validation/proof";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface LmsValidationPanelProps {
  catalog: LmsValidationCatalog;
}

export function LmsValidationPanel({ catalog }: LmsValidationPanelProps) {
  const platformSummaries = catalog.platforms.map(buildPlatformProofSummary);

  return (
    <section className="panel notes-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Validation Baseline</p>
          <h2>Current proof center status</h2>
          <p className="panel-copy">{catalog.summary}</p>
        </div>
        <Link className="ghost-button button-link" href="/validation">
          View Proof Center
        </Link>
      </div>

      <div className="validation-state-grid">
        {catalog.betaScope.map((item) => (
          <span className="status-pill" key={item}>
            {item}
          </span>
        ))}
      </div>

      <div className="lms-validation-grid">
        {catalog.platforms.map((platform) => {
          const summary = buildPlatformProofSummary(platform);
          const latestRecord = getLatestValidationRecord(platform);

          return (
            <article className="runtime-status-card lms-validation-card" key={platform.id}>
              <span className="runtime-status-label">{platform.name}</span>
              <strong>{platform.summary || "Validation record"}</strong>
              <ValidationStatusBadge status={summary.status} />
              <p className="panel-copy">
                {latestRecord.validationDate
                  ? `Latest record: ${latestRecord.validationDate}.`
                  : "No dated validation record yet."}{" "}
                {latestRecord.courseName
                  ? `Course: ${latestRecord.courseName}.`
                  : ""}
                {" "}
                {latestRecord.notes}
              </p>
            </article>
          );
        })}
      </div>

      <p className="panel-copy">
        Latest statuses:{" "}
        {platformSummaries
          .map((platform) => `${platform.name} ${platform.status.replace("_", " ")}`)
          .join(" | ")}
      </p>
    </section>
  );
}
