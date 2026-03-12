import type { Metadata } from "next";

import { LandingPage } from "@/components/LandingPage";
import { loadCourseSamples } from "@/lib/course/load-samples";
import { parseAndCompileCourse } from "@/lib/course/parse";

export const metadata: Metadata = {
  title: "Structured YAML to SCORM",
  description:
    "LDT Engine is a web-native SCORM course engine for YAML authoring, browser preview, reusable templates, and SCORM 1.2 export.",
  openGraph: {
    title: "Structured YAML to SCORM | LDT Engine",
    description:
      "Write branching training modules in YAML, preview them in the browser, and export validated SCORM 1.2 packages.",
    type: "website",
    siteName: "LDT Engine",
  },
};

function buildFeaturedSnippet(source: string): string {
  const lines = source.split("\n");
  const blocksStart = lines.findIndex((line) => line === "blocks:");
  const resultBlockStart = lines.findIndex((line) => line.trim() === "result_block:");
  const nodesStart = lines.findIndex((line) => line === "nodes:");
  const firstNodeEnd = lines.findIndex(
    (line, index) => index > nodesStart + 1 && line.startsWith("  - id: inspect-message")
  );

  if (blocksStart === -1 || nodesStart === -1) {
    return lines.slice(0, 24).join("\n");
  }

  const snippetSections = [
    lines.slice(0, blocksStart).join("\n"),
    lines
      .slice(blocksStart, resultBlockStart === -1 ? nodesStart : resultBlockStart)
      .join("\n"),
    lines.slice(nodesStart, firstNodeEnd === -1 ? lines.length : firstNodeEnd).join("\n"),
  ].filter(Boolean);

  return snippetSections.join("\n...\n");
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
      featuredSource={featuredSample.yaml}
      featuredSnippet={buildFeaturedSnippet(featuredSample.yaml)}
      samples={samples}
    />
  );
}
