export interface MarketingNavItem {
  href: string;
  label: string;
}

export const MARKETING_NAV_ITEMS: readonly MarketingNavItem[] = [
  {
    href: "/product",
    label: "Product",
  },
  {
    href: "/structured-authoring",
    label: "Structured",
  },
  {
    href: "/validation",
    label: "Validation",
  },
  {
    href: "/beta",
    label: "Beta Scope",
  },
  {
    href: "/updates",
    label: "Updates",
  },
  {
    href: "/waitlist",
    label: "Waitlist",
  },
] as const;
