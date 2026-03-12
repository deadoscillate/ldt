import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LDT Engine",
    template: "%s | LDT Engine",
  },
  description:
    "Web-native SCORM course engine with YAML authoring, browser preview, waitlist capture, and SCORM 1.2 export.",
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
