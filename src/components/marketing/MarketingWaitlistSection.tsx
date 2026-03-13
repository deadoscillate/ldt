import { FeedbackForm } from "@/components/FeedbackForm";
import { WaitlistForm } from "@/components/WaitlistForm";

export function MarketingWaitlistSection() {
  return (
    <section className="landing-section">
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
  );
}
