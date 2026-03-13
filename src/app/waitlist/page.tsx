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
          <h1>Get beta updates without digging through the full site</h1>
          <p className="panel-copy">
            Try the studio now, or join the list for beta updates and broader LMS
            validation results.
          </p>
        </div>

        <article className="panel trust-panel">
          <p className="panel-copy">{validationCatalog.summary}</p>
          <p className="panel-copy">
            No login required. No LMS setup required. Early feedback is welcome.
          </p>
        </article>
      </section>

      <MarketingWaitlistSection />
    </MarketingShell>
  );
}
