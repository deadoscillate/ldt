import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import {
  comparisonIntro,
  comparisonRows,
  sharedModuleExamplePoints,
  sharedModulesIntro,
  structuredAuthoringIntro,
  structuredAuthoringPoints,
} from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: buildBrandTitle("Structured Authoring"),
  description: BRAND.metaDescription,
};

export default function StructuredAuthoringPage() {
  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Course-as-Code</p>
          <h1>Training modules defined as source, then compiled into output</h1>
          <p className="panel-copy">{structuredAuthoringIntro}</p>
        </div>

        <div className="feature-grid">
          {structuredAuthoringPoints.map((item) => (
            <article className="panel feature-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Shared Modules In Action</p>
          <h2>Reusable learning components, not duplicated slide logic</h2>
          <p className="panel-copy">{sharedModulesIntro}</p>
        </div>

        <div className="feature-grid">
          {sharedModuleExamplePoints.map((item) => (
            <article className="panel feature-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section comparison-section">
        <div className="section-heading">
          <p className="eyebrow">Why Sapio Forge Exists</p>
          <h2>Learning infrastructure instead of fragile course assembly</h2>
          <p className="panel-copy">{comparisonIntro}</p>
        </div>

        <div className="comparison-table" role="table" aria-label="Workflow comparison">
          <div className="comparison-row comparison-row-header" role="row">
            <span className="comparison-label" role="columnheader">
              Area
            </span>
            <span className="comparison-cell comparison-cell-strong" role="columnheader">
              {BRAND.productName}
            </span>
            <span className="comparison-cell" role="columnheader">
              Traditional tools
            </span>
          </div>
          {comparisonRows.map((row) => (
            <div className="comparison-row" key={row.label} role="row">
              <span className="comparison-label" role="cell">
                {row.label}
              </span>
              <span className="comparison-cell comparison-cell-strong" role="cell">
                {row.thisTool}
              </span>
              <span className="comparison-cell" role="cell">
                {row.traditional}
              </span>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
