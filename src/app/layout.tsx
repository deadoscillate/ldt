import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ldt-opccbpr6c-deadoscillates-projects.vercel.app"),
  applicationName: "LDT Engine",
  title: {
    default: "LDT Engine",
    template: "%s | LDT Engine",
  },
  description:
    "LDT Engine is a web-native SCORM course engine for YAML authoring, browser preview, reusable templates, and SCORM 1.2 export.",
  openGraph: {
    title: "LDT Engine",
    description:
      "Write branching training modules in YAML, preview them in the browser, and export SCORM 1.2 packages.",
    siteName: "LDT Engine",
    type: "website",
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
