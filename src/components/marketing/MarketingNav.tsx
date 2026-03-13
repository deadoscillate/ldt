"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TrackedLink } from "@/components/TrackedLink";
import { BRAND } from "@/lib/app/brand";
import { MARKETING_NAV_ITEMS } from "@/lib/marketing/navigation";

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href;
}

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <header className="landing-nav">
      <Link className="brand-link" href="/">
        {BRAND.productName}
      </Link>
      <div className="landing-nav-content">
        <nav className="landing-nav-links landing-nav-primary" aria-label="Primary">
          {MARKETING_NAV_ITEMS.map((item) => (
            <Link
              className={isActivePath(pathname, item.href) ? "nav-link-active" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="landing-nav-links landing-nav-cta">
          <Link className="ghost-button button-link" href="/waitlist">
            Request Early Access
          </Link>
          <TrackedLink
            className="primary-button button-link"
            eventMetadata={{ placement: "header" }}
            eventName="open_studio_clicked"
            href="/studio"
          >
            Open Studio
          </TrackedLink>
        </div>
      </div>
    </header>
  );
}
