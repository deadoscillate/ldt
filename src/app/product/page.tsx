import type { Metadata } from "next";

import { MarketingDemoSection } from "@/components/marketing/MarketingDemoSection";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import {
  featureCards,
  productProblemCopy,
} from "@/lib/marketing/content";
import { loadMarketingPageData } from "@/lib/marketing/load";
import { SCORM_PACKAGE_CONTENTS } from "@/lib/export/scorm-export";

export const metadata: Metadata = {
  title: buildBrandTitle("Product"),
  description: BRAND.metaDescription,
};

export default async function ProductPage() {
  const marketingData = await loadMarketingPageData();

  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Product</p>
          <h1>Build branching training without rebuilding the same slides</h1>
          <p className="panel-copy">
            Start from a template, edit the scenario in guided forms, preview
            the learner experience, and export SCORM when it is ready.
          </p>
        </div>

        <div className="problem-solution-grid">
          <article className="panel landing-copy-card">
            <p className="eyebrow">Problem</p>
            <h3>{productProblemCopy.problemTitle}</h3>
            <p className="panel-copy">{productProblemCopy.problemBody}</p>
          </article>
          <article className="panel landing-copy-card">
            <p className="eyebrow">Solution</p>
            <h3>{productProblemCopy.solutionTitle}</h3>
            <p className="panel-copy">{productProblemCopy.solutionBody}</p>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Core Capabilities</p>
          <h2>What teams use it for</h2>
        </div>

        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="panel feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p className="panel-copy">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <MarketingDemoSection
        featuredCourse={marketingData.featuredCourse}
        featuredSnippet={marketingData.featuredSnippet}
        featuredSource={marketingData.featuredSource}
        samples={marketingData.samples}
      />

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Export Output</p>
          <h2>See what goes into the SCORM package</h2>
          <p className="panel-copy">
            The export includes the learner runtime, course definition,
            manifest, and supporting files from the same lesson you preview in
            the studio.
          </p>
        </div>

        <article className="panel export-proof-panel">
          <ul className="export-proof-list">
            {SCORM_PACKAGE_CONTENTS.map((filePath) => (
              <li key={filePath}>{filePath}</li>
            ))}
          </ul>
        </article>
      </section>
    </MarketingShell>
  );
}
