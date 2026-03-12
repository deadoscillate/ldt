import type { Metadata } from "next";

import { LandingPage } from "@/components/LandingPage";
import { loadCourseSamples } from "@/lib/course/load-samples";
import { parseAndCompileCourse } from "@/lib/course/parse";

export const metadata: Metadata = {
  title: "YAML to SCORM",
  description:
    "Public landing page for the LDT Engine: explain the product, show the workflow, and capture early access interest.",
};

function buildFeaturedSnippet(source: string): string {
  return source.split("\n").slice(0, 28).join("\n");
}

export default async function Home() {
  const samples = await loadCourseSamples();
  const featuredSample = samples[0];

  if (!featuredSample) {
    throw new Error("At least one sample course is required for the landing page.");
  }

  const featuredCourse = {
    ...parseAndCompileCourse(featuredSample.yaml),
    id: `${featuredSample.id}-landing-demo`,
  };

  return (
    <LandingPage
      featuredCourse={featuredCourse}
      featuredSnippet={buildFeaturedSnippet(featuredSample.yaml)}
      samples={samples}
    />
  );
}
