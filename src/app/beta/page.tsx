import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ProofSummaryCard } from "@/components/ProofSummaryCard";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import { loadMarketingPageData } from "@/lib/marketing/load";

export const metadata: Metadata = {
  title: buildBrandTitle("Beta Scope"),
  description: BRAND.metaDescription,
};

export default async function BetaPage() {
  const { validationCatalog } = await loadMarketingPageData();

  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Current Beta Scope</p>
          <h1>What the beta is ready for today</h1>
          <p className="panel-copy">
            The current beta is focused on structured authoring, browser preview,
            validation, and SCORM export for repeatable training scenarios.
          </p>
        </div>

        <article className="panel beta-scope-panel">
          <ul className="beta-scope-list">
            {validationCatalog.betaScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="landing-section">
        <ProofSummaryCard catalog={validationCatalog} />
      </section>

      <section className="landing-section">
        <article className="panel trust-panel">
          <p className="eyebrow">Trust</p>
          <h2>Validated in SCORM Cloud with clear scope</h2>
          <p className="panel-copy">{validationCatalog.summary}</p>
          <p className="panel-copy">
            Broader LMS testing is still in progress. The proof center shows what
            has and has not been tested so teams can evaluate the platform honestly.
          </p>
        </article>
      </section>
    </MarketingShell>
  );
}
