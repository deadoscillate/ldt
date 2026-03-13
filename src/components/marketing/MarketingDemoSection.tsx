import { DemoLaunchTracker } from "@/components/DemoLaunchTracker";
import { RuntimePlayer } from "@/components/RuntimePlayer";
import { TrackedLink } from "@/components/TrackedLink";
import type { CourseSample } from "@/lib/course/sample-catalog";
import type { CompiledCourse } from "@/lib/course/types";

interface MarketingDemoSectionProps {
  samples: CourseSample[];
  featuredCourse: CompiledCourse;
  featuredSnippet: string;
  featuredSource: string;
}

export function MarketingDemoSection({
  samples,
  featuredCourse,
  featuredSnippet,
  featuredSource,
}: MarketingDemoSectionProps) {
  const featuredSample = samples[0];

  return (
    <section className="landing-section">
      <div className="section-heading">
        <p className="eyebrow">Demo</p>
        <h2>See the learner view before you export</h2>
        <p className="panel-copy">
          This demo uses the same sample content and preview runtime that ship
          with the studio, so what you see here matches the real authoring flow.
        </p>
      </div>

      <div className="demo-layout">
        <article className="panel demo-overview">
          <div className="editor-shell demo-editor-shell">
            <div className="editor-toolbar">
              <span className="editor-file">
                {featuredSample
                  ? `${featuredSample.templateDirectory}/template.yaml`
                  : "template.yaml"}
              </span>
              <span className="editor-language">Source</span>
            </div>
            <p className="demo-snippet-note">
              Short example showing setup values and the first branching decision.
            </p>
            <pre className="demo-code-preview demo-code-preview-compact">
              {featuredSnippet}
            </pre>
          </div>

          <details className="details-panel landing-sample-details">
            <summary>See full example source</summary>
            <pre className="demo-code-preview demo-code-preview-full">
              {featuredSource}
            </pre>
          </details>

          <div className="demo-callout-grid">
            <div className="summary-card">
              <strong>Training flow</strong>
              <span>Keep the steps and branching in one place.</span>
            </div>
            <div className="summary-card">
              <strong>Learner preview</strong>
              <span>Check exactly what learners will see.</span>
            </div>
            <div className="summary-card">
              <strong>SCORM export</strong>
              <span>Package the same validated lesson for your LMS.</span>
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
          Try it in the Studio
        </TrackedLink>
      </div>
    </section>
  );
}
