import type { Metadata } from "next";

import { CourseWorkbench } from "@/components/CourseWorkbench";
import { loadCourseSamples } from "@/lib/course/load-samples";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Author, preview, and export branching SCORM courses from structured YAML.",
};

export default async function StudioPage() {
  const samples = await loadCourseSamples();

  return <CourseWorkbench samples={samples} />;
}
