import { FeedbackForm } from "@/components/FeedbackForm";
import { WaitlistForm } from "@/components/WaitlistForm";

export function MarketingWaitlistSection() {
  return (
    <section className="landing-section">
      <div className="waitlist-layout waitlist-feedback-layout">
        <div className="section-heading waitlist-heading-block">
          <p className="eyebrow">Early Access</p>
          <h2>Try the studio or tell us what would make it useful</h2>
          <p className="panel-copy">
            Start with a template, or leave a quick note about the kind of
            branching training you need to build.
          </p>
        </div>
        <article className="panel waitlist-panel">
          <p className="eyebrow">Get Early Access</p>
          <WaitlistForm />
        </article>
        <article className="panel waitlist-panel">
          <p className="eyebrow">Quick Feedback</p>
          <FeedbackForm />
        </article>
      </div>
    </section>
  );
}
