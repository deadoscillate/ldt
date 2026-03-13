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
        <h2>See the current product workflow</h2>
        <p className="panel-copy">
          The demo reuses the shipped sample course and preview runtime so the page
          stays aligned with the actual authoring experience, including constrained
          simulation shells for email, chat, and dashboard-based training scenes.
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
              <span>Run shell-backed learner paths in the browser before packaging.</span>
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
  );
}
