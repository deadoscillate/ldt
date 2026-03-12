import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  type CourseProject,
  type CourseProjectBinaryFile,
  type CourseProjectSourceFile,
} from "@/lib/project/schema";
import {
  buildCourseProjectFromFileEntries,
  normalizeProjectPath,
} from "@/lib/project/assemble-course-project";

const PROJECT_BINARY_EXTENSIONS = new Set([
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

function mimeTypeForAsset(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    default:
      return "application/octet-stream";
  }
}

function isBinaryProjectFile(filePath: string): boolean {
  return PROJECT_BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function collectDirectoryFiles(
  directoryPath: string,
  relativeRoot = ""
): Promise<Array<{ path: string; absolutePath: string }>> {
  const directoryEntries = await readdir(directoryPath, {
    withFileTypes: true,
  });
  const files: Array<{ path: string; absolutePath: string }> = [];

  for (const entry of directoryEntries) {
    const absolutePath = path.join(directoryPath, entry.name);
    const relativePath = relativeRoot
      ? path.posix.join(relativeRoot, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collectDirectoryFiles(absolutePath, relativePath)));
      continue;
    }

    files.push({
      path: normalizeProjectPath(relativePath),
      absolutePath,
    });
  }

  return files;
}

async function collectCourseProjectFiles(projectDirectory: string): Promise<{
  sourceFiles: CourseProjectSourceFile[];
  binaryFiles: CourseProjectBinaryFile[];
}> {
  const files = await collectDirectoryFiles(projectDirectory);
  const sourceFiles: CourseProjectSourceFile[] = [];
  const binaryFiles: CourseProjectBinaryFile[] = [];

  for (const file of files) {
    if (file.path.startsWith("build/") && file.path !== "build/README.md") {
      continue;
    }

    if (isBinaryProjectFile(file.path)) {
      const contents = await readFile(file.absolutePath);
      binaryFiles.push({
        path: file.path,
        base64: contents.toString("base64"),
        mimeType: mimeTypeForAsset(file.path),
      });
      continue;
    }

    sourceFiles.push({
      path: file.path,
      contents: await readFile(file.absolutePath, "utf8"),
    });
  }

  return {
    sourceFiles: sourceFiles.sort((leftFile, rightFile) =>
      leftFile.path.localeCompare(rightFile.path)
    ),
    binaryFiles: binaryFiles.sort((leftFile, rightFile) =>
      leftFile.path.localeCompare(rightFile.path)
    ),
  };
}

export async function loadCourseProjectFromDirectory(
  projectDirectory: string
): Promise<CourseProject> {
  const files = await collectCourseProjectFiles(projectDirectory);

  return buildCourseProjectFromFileEntries({
    projectRoot: projectDirectory,
    sourceFiles: files.sourceFiles,
    binaryFiles: files.binaryFiles,
  });
}

export async function loadCourseProjects(): Promise<CourseProject[]> {
  const projectRoot = path.join(process.cwd(), "course-projects");
  const projectDirectories = await readdir(projectRoot, {
    withFileTypes: true,
  });

  const projects = await Promise.all(
    projectDirectories
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        loadCourseProjectFromDirectory(path.join(projectRoot, entry.name))
      )
  );

  return projects.sort((leftProject, rightProject) =>
    leftProject.title.localeCompare(rightProject.title)
  );
}
