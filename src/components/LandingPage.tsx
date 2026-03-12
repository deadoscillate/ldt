import Link from "next/link";

import { RuntimePlayer } from "@/components/RuntimePlayer";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";

interface LandingPageProps {
  samples: CourseSample[];
  featuredCourse: CompiledCourse;
  featuredSnippet: string;
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

export function LandingPage({
  samples,
  featuredCourse,
  featuredSnippet,
}: LandingPageProps) {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link className="brand-link" href="/">
          LDT Engine
        </Link>
        <nav className="landing-nav-links" aria-label="Primary">
          <a href="#product">Product</a>
          <a href="#demo">Demo</a>
          <a href="#waitlist">Waitlist</a>
          <Link className="ghost-button button-link" href="/studio">
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
            <a className="primary-button button-link" href="#waitlist">
              Join Early Access
            </a>
            <Link className="ghost-button button-link" href="/studio">
              View Demo
            </Link>
          </div>
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
            The landing page reuses the existing sample course and preview runtime
            so the demo stays aligned with the shipped authoring experience.
          </p>
        </div>

        <div className="demo-layout">
          <article className="panel demo-overview">
            {/* Reuse real sample content in the marketing demo so the page stays aligned with the actual authoring workflow. */}
            <div className="editor-shell demo-editor-shell">
              <div className="editor-toolbar">
                <span className="editor-file">phishing-awareness.yaml</span>
                <span className="editor-language">YAML</span>
              </div>
              <pre className="demo-code-preview">{featuredSnippet}</pre>
            </div>

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
            Open Interactive Demo
          </Link>
        </div>
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
        <div>
          <strong>LDT Engine</strong>
          <p className="panel-copy">
            Structured YAML authoring for branching training modules and SCORM
            export.
          </p>
        </div>
        <div className="footer-links">
          <a href="mailto:hello@your-domain.com">hello@your-domain.com</a>
          <Link href="/studio">Open studio</Link>
        </div>
      </footer>
    </main>
  );
}
