import JSZip from "jszip";

import type { CompiledCourse } from "@/lib/course/types";
import { buildScormManifest } from "@/lib/scorm/manifest";
import {
  buildScormRuntimeHtml,
  buildScormRuntimeScript,
  buildScormRuntimeStyles,
} from "@/lib/scorm/runtime-template";

export const SCORM_PACKAGE_CONTENTS = [
  "imsmanifest.xml",
  "index.html",
  "assets/course.json",
  "assets/runtime.css",
  "assets/runtime.js",
] as const;

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function exportCourseAsScormZip(
  course: CompiledCourse
): Promise<Blob> {
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");

  if (!assetsFolder) {
    throw new Error("Failed to create SCORM asset folder.");
  }

  zip.file(SCORM_PACKAGE_CONTENTS[0], buildScormManifest(course));
  zip.file(SCORM_PACKAGE_CONTENTS[1], buildScormRuntimeHtml(course.title));

  assetsFolder.file("course.json", JSON.stringify(course, null, 2));
  assetsFolder.file("runtime.css", buildScormRuntimeStyles());
  assetsFolder.file("runtime.js", buildScormRuntimeScript());

  return zip.generateAsync({ type: "blob" });
}

export function buildScormFileName(course: CompiledCourse): string {
  const baseName = safeFileName(course.id || course.title || "training-course");
  return `${baseName || "training-course"}-scorm12.zip`;
}
