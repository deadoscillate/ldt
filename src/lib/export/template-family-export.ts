import JSZip from "jszip";

import type { CompiledCourse } from "@/lib/course/types";
import {
  exportCourseAsScormZip,
  type ScormBuildContext,
  type ScormExportMode,
  type ScormExportOptions,
} from "@/lib/export/scorm-export";
import type { ThemePack } from "@/lib/theme/schema";

export interface CourseFamilyBuildInput {
  projectId?: string | null;
  projectTitle?: string | null;
  projectVersion?: string | null;
  packId: string;
  packTitle: string;
  templateId: string;
  templateTitle: string;
  variantId: string;
  variantTitle: string;
  course: CompiledCourse;
  themePack?: ThemePack | null;
  buildContext?: ScormBuildContext | null;
}

export interface CourseFamilyBuildSummaryItem {
  packId: string;
  templateId: string;
  variantId: string;
  projectId: string | null;
  courseId: string;
  courseTitle: string;
  themeId: string | null;
  themeName: string | null;
  themeVersion: string | null;
  exportMode: ScormExportMode;
  diagnosticsEnabled: boolean;
  builtAt: string;
  outputFileName: string;
}

export interface CourseFamilyBuildBundle {
  blob: Blob;
  fileName: string;
  summary: readonly CourseFamilyBuildSummaryItem[];
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildCourseFamilyVariantFileName(input: {
  templateId: string;
  variantId: string;
  themeId?: string | null;
  mode: ScormExportMode;
}): string {
  const templateId = safeFileName(input.templateId || "template");
  const variantId = safeFileName(input.variantId || "variant");
  const themeId = safeFileName(input.themeId || "theme");
  const suffixSegments = ["scorm12"];

  if (input.mode === "validation") {
    suffixSegments.push("validation");
  }

  return [templateId, variantId, themeId, ...suffixSegments].join("__") + ".zip";
}

export async function exportCourseFamilyBuildBundle(
  builds: readonly CourseFamilyBuildInput[],
  options: Pick<ScormExportOptions, "mode" | "validationCatalog" | "themePack"> = {}
): Promise<CourseFamilyBuildBundle> {
  if (builds.length === 0) {
    throw new Error("Select at least one course variant before generating a batch export.");
  }

  const exportMode = options.mode ?? "standard";
  const zip = new JSZip();
  const summary: CourseFamilyBuildSummaryItem[] = [];

  for (const build of builds) {
    const themePack = build.themePack ?? options.themePack ?? null;
    const buildContext: ScormBuildContext = {
      projectId: build.projectId ?? build.buildContext?.projectId ?? null,
      projectTitle: build.projectTitle ?? build.buildContext?.projectTitle ?? null,
      projectVersion: build.projectVersion ?? build.buildContext?.projectVersion ?? null,
      templateId: build.templateId,
      templateTitle: build.templateTitle,
      variantId: build.variantId,
      variantTitle: build.variantTitle,
      themeId: themePack?.id ?? build.buildContext?.themeId ?? null,
      themeName: themePack?.name ?? build.buildContext?.themeName ?? null,
      sourceFiles: build.buildContext?.sourceFiles ?? [],
    };
    const exported = await exportCourseAsScormZip(build.course, {
      mode: exportMode,
      validationCatalog: options.validationCatalog,
      themePack,
      buildContext,
    });
    const outputFileName = buildCourseFamilyVariantFileName({
      templateId: build.templateId,
      variantId: build.variantId,
      themeId: themePack?.id ?? exported.metadata.themeId,
      mode: exportMode,
    });

    zip.file(
      outputFileName,
      await exported.blob.arrayBuffer()
    );

    summary.push({
      packId: build.packId,
      templateId: build.templateId,
      variantId: build.variantId,
      projectId: build.projectId ?? null,
      courseId: build.course.id,
      courseTitle: build.course.title,
      themeId: exported.metadata.themeId,
      themeName: exported.metadata.themeName,
      themeVersion: exported.metadata.themeVersion,
      exportMode,
      diagnosticsEnabled: exportMode === "validation",
      builtAt: exported.metadata.builtAt,
      outputFileName,
    });
  }

  zip.file("build-summary.json", JSON.stringify(summary, null, 2));

  return {
    blob: await zip.generateAsync({ type: "blob" }),
    fileName: `${safeFileName(
      builds[0]!.projectId || builds[0]!.packId || "course-family"
    )}-course-family-builds.zip`,
    summary,
  };
}
