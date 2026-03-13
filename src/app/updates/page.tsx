import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import {
  recentProgressItems,
  roadmapItems,
} from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: buildBrandTitle("Updates"),
  description: BRAND.metaDescription,
};

export default function UpdatesPage() {
  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Recent Progress</p>
          <h1>Recent improvements shipped into the beta</h1>
        </div>

        <div className="roadmap-grid">
          {recentProgressItems.map((item) => (
            <article className="panel roadmap-card" key={item}>
              <p className="panel-copy">{item}</p>
            </article>
          ))}
        </div>
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
    </MarketingShell>
  );
}
