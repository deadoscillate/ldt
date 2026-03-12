import Link from "next/link";

import { RuntimePlayer } from "@/components/RuntimePlayer";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";
import { SCORM_PACKAGE_CONTENTS } from "@/lib/export/scorm-export";

interface LandingPageProps {
  samples: CourseSample[];
  featuredCourse: CompiledCourse;
  featuredSnippet: string;
  featuredSource: string;
}

const featureCards = [
  {
    title: "Structured course authoring",
    description: "Define branching scenarios using simple YAML.",
  },
  {
    title: "Instant browser preview",
    description: "Test training modules directly in the browser.",
  },
  {
    title: "Standards-compliant SCORM export",
    description: "Generate SCORM 1.2 packages compatible with LMS platforms.",
  },
  {
    title: "Template library",
    description:
      "Start with common training scenarios like phishing awareness and harassment reporting.",
  },
];

const audienceCards = [
  "Instructional designers building branching scenario training.",
  "Training consultants producing repeatable SCORM content.",
  "Technical L&D teams who want structured authoring instead of manual slide assembly.",
];

const validationChecklist = [
  "SCORM Cloud launch validated",
  "Completion and pass/fail validated",
  "Score reporting validated",
  "Resume behavior validated",
];

const comparisonRows = [
  {
    label: "Authoring model",
    thisTool: "YAML-based structured authoring",
    traditional: "Manual slide duplication and trigger setup",
  },
  {
    label: "Preview loop",
    thisTool: "Instant browser preview",
    traditional: "Trigger-heavy branching setup before each export",
  },
  {
    label: "Repeatability",
    thisTool: "Template-driven branching scenarios",
    traditional: "Rebuild and re-export similar modules repeatedly",
  },
];

const roadmapItems = [
  "Broader LMS validation beyond SCORM Cloud.",
  "Reusable template packs for common training scenarios.",
  "Improved authoring workflow inside the studio.",
  "Additional deployment hardening for production teams.",
];

export function LandingPage({
  samples,
  featuredCourse,
  featuredSnippet,
  featuredSource,
}: LandingPageProps) {
  const featuredSample = samples[0];

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link className="brand-link" href="/">
          LDT Engine
        </Link>
        <nav className="landing-nav-links" aria-label="Primary">
          <a href="#product">Product</a>
          <a href="#proof">Proof</a>
          <a href="#demo">Demo</a>
          <a href="#waitlist">Waitlist</a>
          <a className="ghost-button button-link" href="#waitlist">
            Request Early Access
          </a>
          <Link className="primary-button button-link" href="/studio">
            Open Studio
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy-block landing-hero-copy">
          <p className="eyebrow">Structured YAML to SCORM</p>
          <h1>
            Write branching training modules in YAML and export them as SCORM
            packages.
          </h1>
          <p className="hero-subheadline">
            Build branching training scenarios in minutes and export
            standards-compliant SCORM for any LMS.
          </p>
          <div className="hero-actions">
            <Link className="primary-button button-link" href="/studio">
              Open Studio
            </Link>
            <a className="ghost-button button-link" href="#waitlist">
              Request Early Access
            </a>
          </div>
          <p className="landing-hero-note">
            No login or LMS setup required to try the studio. Early feedback is welcome.
          </p>
          <WorkflowSteps steps={["YAML", "Preview", "SCORM", "LMS"]} />
        </div>

        <aside className="panel landing-hero-panel">
          <p className="eyebrow">Current validation</p>
          <h2>SCORM Cloud validated before broader LMS rollout</h2>
          <p className="panel-copy">
            SCORM launch, completion, score, pass/fail, and resume behavior have
            been validated in SCORM Cloud. Broader LMS interoperability testing
            is ongoing.
          </p>
          <div className="trust-grid">
            <span className="trust-pill">Launch passed</span>
            <span className="trust-pill">Completion passed</span>
            <span className="trust-pill">Score passed</span>
            <span className="trust-pill">Pass/fail passed</span>
            <span className="trust-pill">Resume passed</span>
          </div>
        </aside>
      </section>

      <section className="landing-proof-band panel" id="proof">
        <div className="landing-proof-copy">
          <p className="eyebrow">Proof</p>
          <h2>Validated behavior, presented honestly</h2>
          <p className="panel-copy">
            The current product has passed SCORM Cloud checks for the core LMS behaviors
            early testers care about most.
          </p>
        </div>
        <div className="proof-checklist" aria-label="Validation checklist">
          {validationChecklist.map((item) => (
            <span className="proof-item" key={item}>
              {item}
            </span>
          ))}
        </div>
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
          <h2>Built for teams that need a faster path to branching SCORM content</h2>
          <p className="panel-copy">
            Instructional designers often build branching scenarios manually using
            complex tools. This tool lets users define training flows in
            structured YAML and export SCORM packages instantly.
          </p>
        </div>

        <div className="problem-solution-grid">
          <article className="panel landing-copy-card">
            <p className="eyebrow">Problem</p>
            <h3>Branching training is still too manual</h3>
            <p className="panel-copy">
              Instructional designers often build branching scenarios manually
              using complex tools and repetitive export workflows.
            </p>
          </article>
          <article className="panel landing-copy-card">
            <p className="eyebrow">Solution</p>
            <h3>Author once in YAML, then preview and export</h3>
            <p className="panel-copy">
              Define the flow in structured YAML, validate it in the browser, and
              export a SCORM 1.2 package without rebuilding the same scenario in
              multiple tools.
            </p>
          </article>
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
                  {featuredSample?.fileName ?? "sample-course.yaml"}
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
            <RuntimePlayer course={featuredCourse} />
          </div>
        </div>

        <div className="demo-footer">
          <Link className="primary-button button-link" href="/studio">
            Open Studio
          </Link>
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
          <p className="eyebrow">Features</p>
          <h2>What early testers can do today</h2>
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
          <p className="eyebrow">Workflow Difference</p>
          <h2>Why teams may prefer this over traditional slide-based branching tools</h2>
          <p className="panel-copy">
            This is a workflow difference, not a claim that one tool replaces every other
            authoring stack.
          </p>
        </div>

        <div className="comparison-table" role="table" aria-label="Workflow comparison">
          <div className="comparison-row comparison-row-header" role="row">
            <span className="comparison-label" role="columnheader">
              Area
            </span>
            <span className="comparison-cell comparison-cell-strong" role="columnheader">
              This tool
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
          <p className="panel-copy">
            SCORM launch, completion, score, pass/fail, and resume behavior have
            been validated in SCORM Cloud. Broader LMS interoperability testing
            is ongoing.
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
        <div className="waitlist-layout">
          <div className="section-heading">
            <p className="eyebrow">Waitlist</p>
            <h2>Request early access</h2>
            <p className="panel-copy">
              Share an email address to hear about early tester access, product
              updates, and broader LMS validation results.
            </p>
          </div>
          <article className="panel waitlist-panel">
            <WaitlistForm />
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-meta">
          <strong>LDT Engine</strong>
          <p className="panel-copy">
            Structured YAML authoring for branching training modules and SCORM
            export.
          </p>
        </div>
        <div className="footer-links">
          <a href="mailto:contact@ldtengine.app">contact@ldtengine.app</a>
          <Link href="/studio">Open Studio</Link>
          <a href="https://github.com/deadoscillate/ldt">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
