import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingWaitlistSection } from "@/components/marketing/MarketingWaitlistSection";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import { loadMarketingPageData } from "@/lib/marketing/load";

export const metadata: Metadata = {
  title: buildBrandTitle("Early Access"),
  description: BRAND.metaDescription,
};

export default async function WaitlistPage() {
  const { validationCatalog } = await loadMarketingPageData();

  return (
    <MarketingShell>
      <section className="landing-section">
        <div className="section-heading">
          <p className="eyebrow">Early Access</p>
          <h1>Get early access and beta updates</h1>
          <p className="panel-copy">
            Open the studio today, or join the list for product updates and LMS
            validation progress.
          </p>
        </div>

        <article className="panel trust-panel">
          <p className="panel-copy">{validationCatalog.summary}</p>
          <p className="panel-copy">
            No login required. Start with a template, preview it in the browser,
            and export when you are ready.
          </p>
        </article>
      </section>

      <MarketingWaitlistSection />
    </MarketingShell>
  );
}
