import type { Metadata } from "next";

import "./globals.css";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  applicationName: BRAND.productName,
  title: {
    default: BRAND.metaTitle,
    template: `%s | ${BRAND.productName}`,
  },
  description: BRAND.metaDescription,
  openGraph: {
    title: buildBrandTitle(BRAND.tagline),
    description: BRAND.metaDescription,
    siteName: BRAND.productName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: buildBrandTitle(BRAND.tagline),
    description: BRAND.metaDescription,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
