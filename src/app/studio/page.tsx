import type { Metadata } from "next";

import { CourseWorkbench } from "@/components/CourseWorkbench";
import { loadCourseSamples } from "@/lib/course/load-samples";
import { loadLmsValidationCatalog } from "@/lib/validation/load";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Author, preview, and export branching SCORM courses from structured YAML.",
};

export default async function StudioPage() {
  const [samples, validationCatalog] = await Promise.all([
    loadCourseSamples(),
    loadLmsValidationCatalog(),
  ]);

  return <CourseWorkbench samples={samples} validationCatalog={validationCatalog} />;
}
