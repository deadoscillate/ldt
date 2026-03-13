import Link from "next/link";

import { TrackedLink } from "@/components/TrackedLink";
import { BRAND } from "@/lib/app/brand";

export function MarketingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-meta">
        <strong>{BRAND.productName}</strong>
        <p className="panel-copy">
          Create interactive training from structured source, preview it in the
          browser, and export SCORM when it is ready.
        </p>
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
  );
}
