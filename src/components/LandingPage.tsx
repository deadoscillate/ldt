import Link from "next/link";

import { BRAND } from "@/lib/app/brand";
import { FeedbackForm } from "@/components/FeedbackForm";
import { DemoLaunchTracker } from "@/components/DemoLaunchTracker";
import { LandingViewTracker } from "@/components/LandingViewTracker";
import { ProofSummaryCard } from "@/components/ProofSummaryCard";
import { RuntimePlayer } from "@/components/RuntimePlayer";
import { TrackedLink } from "@/components/TrackedLink";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";
import { SCORM_PACKAGE_CONTENTS } from "@/lib/export/scorm-export";
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

const featureCards = [
  {
    title: "Structured course definitions",
    description: "Define courses as readable source instead of fragile exports.",
  },
  {
    title: "Reusable module libraries",
    description: "Reuse scenarios, lessons, and checks across course families.",
  },
  {
    title: "SCORM compilation",
    description: "Compile validated source into deployable SCORM 1.2 packages.",
  },
  {
    title: "Version-controlled training systems",
    description:
      "Keep source, tests, themes, and builds organized like software projects.",
  },
];

const conceptCards = [
  {
    title: "Structured Authoring",
    description: "Define training content as structured source instead of slide decks.",
  },
  {
    title: "Reusable Modules",
    description: "Build libraries of knowledge checks, scenarios, and lessons.",
  },
  {
    title: "Reproducible Builds",
    description: "Compile consistent SCORM packages every time.",
  },
] as const;

const audienceCards = [
  "Instructional designers building branching scenario training.",
  "Training consultants producing repeatable SCORM content.",
  "Technical L&D teams who want structured authoring instead of manual branching assembly.",
];

const comparisonRows = [
  {
    label: "Authoring model",
    thisTool: "Structured source",
    traditional: "Slide-based authoring",
  },
  {
    label: "Reuse",
    thisTool: "Reusable modules",
    traditional: "Manual duplication",
  },
  {
    label: "Builds",
    thisTool: "Reproducible builds",
    traditional: "Fragile exports",
  },
  {
    label: "Maintenance",
    thisTool: "Version-controlled training systems",
    traditional: "Difficult to maintain at scale",
  },
];

const structuredAuthoringPoints = [
  "Readable YAML source files stay as the system of record.",
  "Compiled preview and SCORM packages are generated from validated source.",
  "Templates and variables make repeated course families faster to ship.",
  "Plain-text source works naturally with Git, review, and version history.",
];

const roadmapItems = [
  "Broader LMS validation beyond SCORM Cloud.",
  "Reusable template packs for common training scenarios.",
  "Improved authoring workflow inside the studio.",
  "Additional deployment hardening for production teams.",
];

const recentProgressItems = [
  "SCORM Cloud validation completed for launch, completion, score, pass/fail, and resume.",
  "Resume behavior and completion state handling were hardened for SCORM 1.2 delivery.",
  "Template-driven authoring with reusable blocks and placeholders was added to the studio.",
];

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
    <main className="landing-shell">
      <LandingViewTracker />
      <header className="landing-nav">
          <Link className="brand-link" href="/">
          {BRAND.productName}
        </Link>
        <nav className="landing-nav-links" aria-label="Primary">
          <a href="#product">Product</a>
          <a href="#structured">Structured</a>
          <Link href="/validation">Validation</Link>
          <a href="#beta-scope">Beta Scope</a>
          <a href="#updates">Updates</a>
          <a href="#waitlist">Waitlist</a>
          <a className="ghost-button button-link" href="#waitlist">
            Request Early Access
          </a>
          <TrackedLink
            className="primary-button button-link"
            eventMetadata={{ placement: "header" }}
            eventName="open_studio_clicked"
            href="/studio"
          >
            Open Studio
          </TrackedLink>
        </nav>
      </header>

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
            <a className="ghost-button button-link" href="#waitlist">
              Request Early Access
            </a>
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

      <section className="landing-section" id="product">
        <div className="section-heading">
          <p className="eyebrow">Product</p>
          <h2>Sapio Forge is structured authoring for modern training systems</h2>
          <p className="panel-copy">{BRAND.positioningStatement}</p>
        </div>

        <div className="problem-solution-grid">
          <article className="panel landing-copy-card">
            <p className="eyebrow">Problem</p>
            <h3>Training logic is still too manual in traditional builders</h3>
            <p className="panel-copy">
              Many teams still manage branching logic through duplicated screens,
              repeated manual edits, and exports that are hard to review or rebuild.
            </p>
          </article>
          <article className="panel landing-copy-card">
            <p className="eyebrow">Solution</p>
            <h3>Define source once, then compile preview and SCORM output</h3>
            <p className="panel-copy">
              Sapio Forge keeps course source readable, reusable, and versionable,
              then compiles that same definition into browser preview and SCORM
              build artifacts.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="structured">
        <div className="section-heading">
          <p className="eyebrow">Course-as-Code</p>
          <h2>Training modules defined as source, then compiled into output</h2>
          <p className="panel-copy">
            Instead of building courses as slide decks, Sapio Forge treats training
            modules as structured source. This allows teams to version, reuse, test,
            and compile learning systems the same way developers build software.
          </p>
        </div>

        <div className="feature-grid">
          {structuredAuthoringPoints.map((item) => (
            <article className="panel feature-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="beta-scope">
        <div className="section-heading">
          <p className="eyebrow">Current Beta Scope</p>
          <h2>What the beta already does well</h2>
          <p className="panel-copy">
            The current scope is focused on authoring, validation, preview, and SCORM
            packaging for repeatable branching modules.
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

      <section className="landing-section" id="updates">
        <div className="section-heading">
          <p className="eyebrow">Recent Progress</p>
          <h2>Recent improvements shipped into the beta</h2>
        </div>

        <div className="roadmap-grid">
          {recentProgressItems.map((item) => (
            <article className="panel roadmap-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="demo">
        <div className="section-heading">
          <p className="eyebrow">Demo</p>
          <h2>See the current product workflow</h2>
          <p className="panel-copy">
            The landing page reuses the shipped sample course and preview runtime so
            the demo stays aligned with the actual authoring experience.
          </p>
        </div>

        <div className="demo-layout">
          <article className="panel demo-overview">
            {/* Keep the landing snippet short so non-technical visitors can grasp the structure quickly before expanding the full sample. */}
            <div className="editor-shell demo-editor-shell">
              <div className="editor-toolbar">
                <span className="editor-file">
                  {featuredSample
                    ? `${featuredSample.templateDirectory}/template.yaml`
                    : "template.yaml"}
                </span>
                <span className="editor-language">YAML</span>
              </div>
              <p className="demo-snippet-note">
                Short sample showing course metadata, template data, one reusable block,
                and the first branching node.
              </p>
              <pre className="demo-code-preview demo-code-preview-compact">
                {featuredSnippet}
              </pre>
            </div>

            <details className="details-panel landing-sample-details">
              <summary>View full sample</summary>
              <pre className="demo-code-preview demo-code-preview-full">
                {featuredSource}
              </pre>
            </details>

            <div className="demo-callout-grid">
              <div className="summary-card">
                <strong>YAML authoring</strong>
                <span>Write branching flows in a single structured course file.</span>
              </div>
              <div className="summary-card">
                <strong>Browser preview</strong>
                <span>Run the learner path in the browser before packaging.</span>
              </div>
              <div className="summary-card">
                <strong>SCORM export</strong>
                <span>Download a SCORM 1.2 zip from the validated course definition.</span>
              </div>
            </div>

            <div className="sample-tag-row" aria-label="Sample templates">
              {samples.map((sample) => (
                <span className="sample-tag" key={sample.id}>
                  {sample.title}
                </span>
              ))}
            </div>
          </article>

          <div className="demo-preview-frame">
            <DemoLaunchTracker />
            <RuntimePlayer course={featuredCourse} />
          </div>
        </div>

        <div className="demo-footer">
          <TrackedLink
            className="primary-button button-link"
            eventMetadata={{ placement: "demo-footer" }}
            eventName="open_studio_clicked"
            href="/studio"
          >
            Open Studio
          </TrackedLink>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Export Output</p>
          <h2>Show exactly what the SCORM package contains</h2>
          <p className="panel-copy">
            Export a standards-compliant SCORM 1.2 package generated from the validated
            course definition.
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

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Core Capabilities</p>
          <h2>What the platform already supports</h2>
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

      <section className="landing-section comparison-section">
        <div className="section-heading">
          <p className="eyebrow">Why Sapio Forge Exists</p>
          <h2>Learning infrastructure instead of fragile course assembly</h2>
          <p className="panel-copy">
            Sapio Forge is not a Storyline clone or a presentation builder. It is for
            teams that want training systems to be maintainable, reusable, and
            buildable from source.
          </p>
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

      <section className="landing-section">
        <article className="panel trust-panel">
          <p className="eyebrow">Trust</p>
          <h2>Validated in SCORM Cloud with honest scope</h2>
          <p className="panel-copy">{validationCatalog.summary}</p>
          <p className="panel-copy">
            Current platform status:{" "}
            {proofSummary
              .map((item) => `${item.name} ${item.status.replace("_", " ")}`)
              .join(" | ")}
          </p>
        </article>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">What&apos;s Next</p>
          <h2>Next areas of product hardening</h2>
          <p className="panel-copy">
            The roadmap is deliberately practical and focused on making the current
            workflow more dependable.
          </p>
        </div>

        <div className="roadmap-grid">
          {roadmapItems.map((item) => (
            <article className="panel roadmap-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="waitlist">
        <div className="waitlist-layout waitlist-feedback-layout">
          <div className="section-heading waitlist-heading-block">
            <p className="eyebrow">Beta Access</p>
            <h2>Try the studio now or leave a quick signal</h2>
            <p className="panel-copy">
              Join the beta list for updates, or leave a short note about what you
              would need before using this on a real project.
            </p>
          </div>
          <article className="panel waitlist-panel">
            <p className="eyebrow">Request Early Access</p>
            <WaitlistForm />
          </article>
          <article className="panel waitlist-panel">
            <p className="eyebrow">Quick Feedback</p>
            <FeedbackForm />
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-meta">
          <strong>{BRAND.productName}</strong>
          <p className="panel-copy">{BRAND.longDescription}</p>
        </div>
        <div className="footer-links">
          <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
          <Link href="/validation">Validation</Link>
          <TrackedLink
            eventMetadata={{ placement: "footer" }}
            eventName="open_studio_clicked"
            href="/studio"
          >
            Open Studio
          </TrackedLink>
          <a href={BRAND.githubUrl}>GitHub</a>
        </div>
      </footer>
    </main>
  );
}
