import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ProofSummaryCard } from "@/components/ProofSummaryCard";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import { loadMarketingPageData } from "@/lib/marketing/load";

export const metadata: Metadata = {
  title: buildBrandTitle("Beta"),
  description: BRAND.metaDescription,
};

export default async function BetaPage() {
  const { validationCatalog } = await loadMarketingPageData();

  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Current Beta Scope</p>
          <h1>What you can use in the beta today</h1>
          <p className="panel-copy">
            The beta is ready for building branching training in the browser,
            checking it before export, and packaging it as SCORM.
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
          <h2>What has been proven so far</h2>
          <p className="panel-copy">{validationCatalog.summary}</p>
          <p className="panel-copy">
            Broader LMS testing is still in progress. The proof center shows
            exactly what has and has not been tested so teams can evaluate the platform without guesswork.
          </p>
        </article>
      </section>
    </MarketingShell>
  );
}
