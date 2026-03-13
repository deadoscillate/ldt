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
    label: "How It Works",
  },
  {
    href: "/validation",
    label: "Validation",
  },
  {
    href: "/beta",
    label: "Beta",
  },
  {
    href: "/updates",
    label: "Updates",
  },
  {
    href: "/waitlist",
    label: "Early Access",
  },
] as const;
