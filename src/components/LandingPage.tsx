import Link from "next/link";

import { BRAND } from "@/lib/app/brand";
import { MarketingDemoSection } from "@/components/marketing/MarketingDemoSection";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingWaitlistSection } from "@/components/marketing/MarketingWaitlistSection";
import { ProofSummaryCard } from "@/components/ProofSummaryCard";
import { TrackedLink } from "@/components/TrackedLink";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";
import {
  audienceCards,
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
  const featuredSample = samples[0];
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
              Request Early Access
            </Link>
          </div>
          <p className="landing-hero-note">
            {BRAND.positioningStatement}
          </p>
          <WorkflowSteps steps={["YAML", "Preview", "SCORM", "LMS"]} />
        </div>

        <aside className="panel landing-hero-panel">
          <p className="eyebrow">Current validation</p>
          <h2>SCORM Cloud validated before broader LMS rollout</h2>
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
          <h2>Validated behavior, presented platform by platform</h2>
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
          <h2>What Sapio Forge is built to do</h2>
          <p className="panel-copy">{BRAND.longDescription}</p>
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
        <ProofSummaryCard catalog={validationCatalog} />
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Who It&apos;s For</p>
          <h2>Built for teams shipping repeatable branching training</h2>
          <p className="panel-copy">
            The product is intentionally narrow: structured authoring, fast preview, and
            SCORM export without the overhead of a large desktop toolchain.
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

      <MarketingDemoSection
        featuredCourse={featuredCourse}
        featuredSnippet={featuredSnippet}
        featuredSource={featuredSource}
        samples={samples}
      />

      <section className="landing-section">
        <article className="panel trust-panel">
          <p className="eyebrow">Explore Next</p>
          <h2>Follow the product by topic instead of one long page</h2>
          <p className="panel-copy">
            Product fit, structured authoring, validation, beta scope, updates, and
            early access now each have their own route in the site navigation.
          </p>
          <div className="button-row">
            <Link className="ghost-button button-link" href="/product">
              Product
            </Link>
            <Link className="ghost-button button-link" href="/structured-authoring">
              Structured
            </Link>
            <Link className="ghost-button button-link" href="/beta">
              Beta Scope
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
