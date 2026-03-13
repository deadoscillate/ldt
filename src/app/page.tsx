import type { Metadata } from "next";

import { LandingPage } from "@/components/LandingPage";
import { BRAND } from "@/lib/app/brand";
import { loadMarketingPageData } from "@/lib/marketing/load";

export const metadata: Metadata = {
  description: BRAND.metaDescription,
  openGraph: {
    title: BRAND.metaTitle,
    description: BRAND.landingValueProp,
    type: "website",
    siteName: BRAND.productName,
  },
};

export default async function Home() {
  const marketingData = await loadMarketingPageData();

  return (
    <LandingPage
      featuredCourse={marketingData.featuredCourse}
      featuredSource={marketingData.featuredSource}
      featuredSnippet={marketingData.featuredSnippet}
      samples={marketingData.samples}
      validationCatalog={marketingData.validationCatalog}
    />
  );
}
