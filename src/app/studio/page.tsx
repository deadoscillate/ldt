import type { Metadata } from "next";

import { CourseWorkbench } from "@/components/CourseWorkbench";
import { loadTemplatePacks } from "@/lib/course/load-template-packs";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { loadThemePacks } from "@/lib/theme/load-theme-packs";
import { loadLmsValidationCatalog } from "@/lib/validation/load";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Author, preview, and export branching SCORM courses from structured YAML.",
};

export default async function StudioPage() {
  const [courseProjects, templatePacks, themePacks, validationCatalog] = await Promise.all([
    loadCourseProjects(),
    loadTemplatePacks(),
    loadThemePacks(),
    loadLmsValidationCatalog(),
  ]);

  return (
    <CourseWorkbench
      courseProjects={courseProjects}
      templatePacks={templatePacks}
      themePacks={themePacks}
      validationCatalog={validationCatalog}
    />
  );
}
