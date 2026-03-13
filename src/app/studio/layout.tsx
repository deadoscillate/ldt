import type { Metadata } from "next";

import { CourseWorkbench } from "@/components/CourseWorkbench";
import { BRAND } from "@/lib/app/brand";
import { loadTemplatePacks } from "@/lib/course/load-template-packs";
import { loadModuleLibrary } from "@/lib/module-library/load";
import { buildModuleUsageIndex } from "@/lib/project/affected";
import { loadCourseProjects } from "@/lib/project/load-course-projects";
import { loadThemePacks } from "@/lib/theme/load-theme-packs";
import { loadLmsValidationCatalog } from "@/lib/validation/load";

export const metadata: Metadata = {
  title: "Studio",
  description:
    `${BRAND.studioName} is the structured authoring workspace for course source, learner preview, and reproducible SCORM builds.`,
};

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [courseProjects, templatePacks, themePacks, validationCatalog, moduleLibrary] =
    await Promise.all([
      loadCourseProjects(),
      loadTemplatePacks(),
      loadThemePacks(),
      loadLmsValidationCatalog(),
      loadModuleLibrary(),
    ]);

  return (
    <>
      <CourseWorkbench
        courseProjects={courseProjects}
        templatePacks={templatePacks}
        themePacks={themePacks}
        validationCatalog={validationCatalog}
        moduleLibrary={moduleLibrary}
        moduleUsageIndex={buildModuleUsageIndex(courseProjects, moduleLibrary)}
      />
      <div hidden>{children}</div>
    </>
  );
}
