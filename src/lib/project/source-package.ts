import JSZip from "jszip";

import {
  buildCourseProjectFromFileEntries,
} from "@/lib/project/assemble-course-project";
import type {
  CourseProject,
  CourseProjectBinaryFile,
  CourseProjectSourceFile,
} from "@/lib/project/schema";

const PROJECT_SOURCE_BINARY_EXTENSIONS = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);

export interface CourseProjectSourceArchiveManifest {
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  exportedAt: string;
  sourceFiles: readonly string[];
  binaryFiles: readonly string[];
}

export interface CourseProjectSourceArchive {
  blob: Blob;
  fileName: string;
  manifest: CourseProjectSourceArchiveManifest;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function isBinaryProjectFile(filePath: string): boolean {
  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return PROJECT_SOURCE_BINARY_EXTENSIONS.has(extension);
}

export function buildCourseProjectSourceArchiveFileName(
  project: Pick<CourseProject, "id">
): string {
  const safeId = safeFileName(project.id || "course-project");
  return `${safeId || "course-project"}-source.zip`;
}

export async function exportCourseProjectSourceArchive(
  project: CourseProject,
  exportedAt = new Date().toISOString()
): Promise<CourseProjectSourceArchive> {
  const zip = new JSZip();
  const manifest: CourseProjectSourceArchiveManifest = {
    projectId: project.id,
    projectTitle: project.title,
    projectVersion: project.version,
    exportedAt,
    sourceFiles: project.sourceFiles.map((file) => file.path),
    binaryFiles: project.binaryFiles.map((file) => file.path),
  };

  project.sourceFiles.forEach((file) => {
    zip.file(normalizePath(file.path), file.contents);
  });
  project.binaryFiles.forEach((file) => {
    zip.file(normalizePath(file.path), file.base64, { base64: true });
  });
  zip.file("project-source-manifest.json", JSON.stringify(manifest, null, 2));

  return {
    blob: await zip.generateAsync({ type: "blob" }),
    fileName: buildCourseProjectSourceArchiveFileName(project),
    manifest,
  };
}

export async function importCourseProjectSourceArchive(
  input: Blob | ArrayBuffer
): Promise<CourseProject> {
  const zipInput = input instanceof Blob ? await input.arrayBuffer() : input;
  const zip = await JSZip.loadAsync(zipInput);
  const sourceFiles: CourseProjectSourceFile[] = [];
  const binaryFiles: CourseProjectBinaryFile[] = [];

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) {
        return;
      }

      const normalizedPath = normalizePath(entry.name);

      if (normalizedPath === "project-source-manifest.json") {
        return;
      }

      if (isBinaryProjectFile(normalizedPath)) {
        const contents = await entry.async("base64");
        const mimeType =
          normalizedPath.endsWith(".svg")
            ? "image/svg+xml"
            : normalizedPath.endsWith(".png")
              ? "image/png"
              : normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg")
                ? "image/jpeg"
                : normalizedPath.endsWith(".gif")
                  ? "image/gif"
                  : normalizedPath.endsWith(".webp")
                    ? "image/webp"
                    : normalizedPath.endsWith(".woff2")
                      ? "font/woff2"
                      : normalizedPath.endsWith(".woff")
                        ? "font/woff"
                        : normalizedPath.endsWith(".ttf")
                          ? "font/ttf"
                          : normalizedPath.endsWith(".otf")
                            ? "font/otf"
                            : "application/octet-stream";

        binaryFiles.push({
          path: normalizedPath,
          base64: contents,
          mimeType,
        });
        return;
      }

      sourceFiles.push({
        path: normalizedPath,
        contents: await entry.async("string"),
      });
    })
  );

  return buildCourseProjectFromFileEntries({
    projectRoot: ".",
    sourceFiles,
    binaryFiles,
  });
}
