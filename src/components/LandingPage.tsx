import Link from "next/link";

import { BRAND } from "@/lib/app/brand";
import { MarketingDemoSection } from "@/components/marketing/MarketingDemoSection";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingWaitlistSection } from "@/components/marketing/MarketingWaitlistSection";
import { TrackedLink } from "@/components/TrackedLink";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";
import {
  audienceCards,
  comparisonIntro,
  comparisonRows,
  conceptCards,
} from "@/lib/marketing/content";
import {
  buildPlatformProofSummary,
  getLatestValidationRecord,
} from "@/lib/validation/proof";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface LandingPageProps {
  samples: CourseSample[];
  featuredCourse: CompiledCourse;
  featuredSnippet: string;
  featuredSource: string;
  validationCatalog: LmsValidationCatalog;
}

export function LandingPage({
  samples,
  featuredCourse,
  featuredSnippet,
  featuredSource,
  validationCatalog,
}: LandingPageProps) {
  const scormCloudPlatform = validationCatalog.platforms.find(
    (platform) => platform.id === "scorm-cloud"
  );
  const scormCloudRecord = scormCloudPlatform
    ? getLatestValidationRecord(scormCloudPlatform)
    : null;
  const proofSummary = validationCatalog.platforms.map(buildPlatformProofSummary);

  return (
    <MarketingShell trackView>

      <section className="landing-hero">
        <div className="hero-copy-block landing-hero-copy">
          <p className="eyebrow">{BRAND.productName}</p>
          <h1>{BRAND.tagline}</h1>
          <p className="hero-subheadline">{BRAND.heroSubheadline}</p>
          <div className="hero-actions">
            <TrackedLink
              className="primary-button button-link"
              eventMetadata={{ placement: "hero" }}
              eventName="open_studio_clicked"
              href="/studio"
            >
              Open Studio
            </TrackedLink>
            <Link className="ghost-button button-link" href="/waitlist">
              Early Access
            </Link>
          </div>
          <p className="landing-hero-note">
            Start in guided editing for the fastest first lesson. Open source and
            project tools only when you want deeper control.
          </p>
          <WorkflowSteps steps={["Template", "Edit", "Preview", "SCORM"]} />
        </div>

        <aside className="panel landing-hero-panel">
          <p className="eyebrow">Current validation</p>
          <h2>Validated in SCORM Cloud. Broader LMS testing is in progress.</h2>
          <p className="panel-copy">{validationCatalog.summary}</p>
          <div className="trust-grid">
            {scormCloudRecord
              ? Object.entries(scormCloudRecord.behaviors)
                  .filter(([, status]) => status === "passed")
                  .map(([behaviorKey]) => (
                    <span className="trust-pill" key={behaviorKey}>
                      {behaviorKey === "passFail"
                        ? "Pass/fail passed"
                        : `${behaviorKey.charAt(0).toUpperCase()}${behaviorKey.slice(1)} passed`}
                    </span>
                  ))
              : null}
          </div>
          <Link className="inline-link-button" href="/validation">
            View proof center
          </Link>
        </aside>
      </section>

      <section className="landing-proof-band panel" id="proof">
        <div className="landing-proof-copy">
          <p className="eyebrow">Proof</p>
          <h2>See what has been tested already</h2>
          <p className="panel-copy">{validationCatalog.philosophy}</p>
        </div>
        <div className="proof-checklist" aria-label="Validation checklist">
          {proofSummary.map((item) => (
            <span className="proof-item" key={item.id}>
              {item.name}: {item.status.replace("_", " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Core Concepts</p>
          <h2>What Sapio Forge helps you do</h2>
          <p className="panel-copy">
            {BRAND.positioningStatement}
          </p>
        </div>

        <div className="feature-grid">
          {conceptCards.map((card) => (
            <article className="panel feature-card" key={card.title}>
              <h3>{card.title}</h3>
              <p className="panel-copy">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Who It&apos;s For</p>
          <h2>Made for teams building branching training</h2>
          <p className="panel-copy">
            Most teams start in guided editing. Templates, shared modules, and
            deeper source workflows stay available as the process grows.
          </p>
        </div>

        <div className="who-grid">
          {audienceCards.map((item) => (
            <article className="panel who-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section comparison-section">
        <div className="section-heading">
          <p className="eyebrow">Why Sapio Forge Exists</p>
          <h2>A simpler workflow than duplicated slides and fragile exports</h2>
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

      <MarketingDemoSection
        featuredCourse={featuredCourse}
        featuredSnippet={featuredSnippet}
        featuredSource={featuredSource}
        samples={samples}
      />

      <section className="landing-section">
        <article className="panel trust-panel">
          <p className="eyebrow">Next Steps</p>
          <h2>Choose the page that matches what you need</h2>
          <p className="panel-copy">
            Start with the main overview here, then open the pages that explain
            the workflow, beta status, updates, or early access in more detail.
          </p>
          <div className="button-row">
            <Link className="ghost-button button-link" href="/product">
              Product
            </Link>
            <Link className="ghost-button button-link" href="/structured-authoring">
              How It Works
            </Link>
            <Link className="ghost-button button-link" href="/beta">
              Beta
            </Link>
            <Link className="ghost-button button-link" href="/updates">
              Updates
            </Link>
          </div>
        </article>
      </section>

      <MarketingWaitlistSection />
    </MarketingShell>
  );
}
