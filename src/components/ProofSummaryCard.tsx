import Link from "next/link";

import { ValidationStatusBadge } from "@/components/ValidationStatusBadge";
import { buildProofSummaryCardData } from "@/lib/validation/proof";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface ProofSummaryCardProps {
  catalog: LmsValidationCatalog;
}

export function ProofSummaryCard({ catalog }: ProofSummaryCardProps) {
  const card = buildProofSummaryCardData(catalog);

  return (
    <article className="panel proof-summary-card">
      <p className="eyebrow">Proof Summary</p>
      <h2>Structured authoring with visible interoperability proof</h2>
      <p className="panel-copy">{card.valueProp}</p>
      <div className="validation-state-grid">
        <span className="status-pill">SCORM Cloud baseline</span>
        <ValidationStatusBadge status={card.scormCloudStatus} />
      </div>
      <div className="proof-platform-grid">
        {card.platformStatuses.map((platform) => (
          <div className="runtime-status-card" key={platform.id}>
            <span className="runtime-status-label">{platform.name}</span>
            <strong>{platform.latestValidationDate || "No dated record yet"}</strong>
            <ValidationStatusBadge status={platform.status} />
          </div>
        ))}
      </div>
      <div className="summary-inline-list">
        {card.testedBehaviorLabels.map((label) => (
          <span className="summary-inline-pill" key={label}>
            {label}
          </span>
        ))}
      </div>
      <div className="button-row">
        <Link className="primary-button button-link" href={card.studioHref}>
          Open Studio
        </Link>
        <Link className="ghost-button button-link" href={card.proofHref}>
          View Proof Center
        </Link>
      </div>
    </article>
  );
}
