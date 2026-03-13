import type { ReactNode } from "react";

import { LandingViewTracker } from "@/components/LandingViewTracker";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

interface MarketingShellProps {
  children: ReactNode;
  trackView?: boolean;
}

export function MarketingShell({
  children,
  trackView = false,
}: MarketingShellProps) {
  return (
    <main className="landing-shell">
      {trackView ? <LandingViewTracker /> : null}
      <MarketingNav />
      {children}
      <MarketingFooter />
    </main>
  );
}
