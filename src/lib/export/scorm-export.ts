import JSZip from "jszip";

import type { CompiledCourse } from "@/lib/course/types";
import {
  runScormExportPreflight,
  type ScormPreflightResult,
} from "@/lib/export/scorm-preflight";
import { buildScormManifest } from "@/lib/scorm/manifest";
import {
  buildScormRuntimeHtml,
  buildScormRuntimeScript,
  buildScormRuntimeStyles,
} from "@/lib/scorm/runtime-template";
import {
  applyThemePackToCourse,
  buildThemeStylesheet,
  buildThemeTokenSummary,
} from "@/lib/theme/apply";
import type { ThemePack } from "@/lib/theme/schema";
import { buildValidationNotesText } from "@/lib/validation/checklist";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

export type ScormExportMode = "standard" | "validation";

export interface ScormBuildContext {
  projectId?: string | null;
  projectTitle?: string | null;
  projectVersion?: string | null;
  templateId?: string | null;
  templateTitle?: string | null;
  variantId?: string | null;
  variantTitle?: string | null;
  themeId?: string | null;
  themeName?: string | null;
  sourceFiles?: readonly string[];
}

export interface ScormExportOptions {
  mode?: ScormExportMode;
  builtAt?: string;
  validationCatalog?: LmsValidationCatalog | null;
  themePack?: ThemePack | null;
  buildContext?: ScormBuildContext | null;
}

export interface ScormPackageArtifact {
  path: string;
  contents: string;
  base64?: boolean;
}

export interface ScormPackageMetadata {
  courseId: string;
  courseTitle: string;
  projectId: string | null;
  projectTitle: string | null;
  projectVersion: string | null;
  templateId: string | null;
  templateTitle: string | null;
  variantId: string | null;
  variantTitle: string | null;
  themeId: string | null;
  themeName: string | null;
  themeVersion: string | null;
  themeTokens: ReturnType<typeof buildThemeTokenSummary>;
  exportMode: ScormExportMode;
  diagnosticsEnabled: boolean;
  builtAt: string;
  buildFingerprint: string;
  outputFileName: string;
  launchPath: string;
  packageContents: readonly string[];
  preflight: ScormPreflightResult;
}

export interface ScormBuildManifest {
  projectId: string | null;
  projectTitle: string | null;
  projectVersion: string | null;
  templateId: string | null;
  templateTitle: string | null;
  variantId: string | null;
  variantTitle: string | null;
  themeId: string | null;
  themeName: string | null;
  courseId: string;
  courseTitle: string;
  exportMode: ScormExportMode;
  diagnosticsEnabled: boolean;
  builtAt: string;
  outputFileName: string;
  launchPath: string;
  sourceFiles: readonly string[];
  packageContents: readonly string[];
  buildFingerprint: string;
  validationReady: boolean;
}

export interface ScormExportBundle {
  blob: Blob;
  fileName: string;
  artifacts: readonly ScormPackageArtifact[];
  metadata: ScormPackageMetadata;
  validationNotes: string;
  buildManifest: ScormBuildManifest;
}

export const SCORM_PACKAGE_CONTENTS = [
  "imsmanifest.xml",
  "index.html",
  "assets/course.json",
  "assets/runtime.css",
  "assets/theme.css",
  "assets/runtime.js",
  "build-manifest.json",
] as const;

export function buildScormPackageContents(
  mode: ScormExportMode = "standard",
  themePack: ThemePack | null = null
): readonly string[] {
  const contents: string[] = [...SCORM_PACKAGE_CONTENTS];

  if (themePack) {
    contents.push(...themePack.bundleFiles.map((asset) => asset.bundlePath));
  }

  return mode === "validation" ? [...contents, "validation-notes.txt"] : contents;
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function createBuildFingerprint(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(36);
}

export function buildScormFileName(
  course: CompiledCourse,
  options: Pick<ScormExportOptions, "mode" | "buildContext"> = {}
): string {
  const buildContext = options.buildContext ?? null;
  const projectSegments = [
    buildContext?.templateId,
    buildContext?.variantId,
    buildContext?.themeId ?? buildContext?.themeName,
  ]
    .map((value) => safeFileName(value ?? ""))
    .filter((value) => value.length > 0);

  if (projectSegments.length >= 2) {
    const suffixSegments = ["scorm12"];

    if (options.mode === "validation") {
      suffixSegments.push("validation");
    }

    return [...projectSegments, ...suffixSegments].join("__") + ".zip";
  }

  const baseName = safeFileName(course.id || course.title || "training-course");
  const suffix = options.mode === "validation" ? "-validation" : "";
  return `${baseName || "training-course"}-scorm12${suffix}.zip`;
}

export function buildScormBuildManifest(input: {
  course: CompiledCourse;
  mode: ScormExportMode;
  builtAt: string;
  packageContents: readonly string[];
  preflight: ScormPreflightResult;
  outputFileName: string;
  launchPath?: string;
  buildContext?: ScormBuildContext | null;
}): ScormBuildManifest {
  const buildContext = input.buildContext ?? null;
  const buildFingerprint = createBuildFingerprint(
    JSON.stringify({
      course: input.course,
      buildContext,
      packageContents: input.packageContents,
      exportMode: input.mode,
    })
  );

  return {
    projectId: buildContext?.projectId ?? null,
    projectTitle: buildContext?.projectTitle ?? null,
    projectVersion: buildContext?.projectVersion ?? null,
    templateId: buildContext?.templateId ?? null,
    templateTitle: buildContext?.templateTitle ?? null,
    variantId: buildContext?.variantId ?? null,
    variantTitle: buildContext?.variantTitle ?? null,
    themeId: buildContext?.themeId ?? input.course.theme.id,
    themeName: buildContext?.themeName ?? input.course.theme.name,
    courseId: input.course.id,
    courseTitle: input.course.title,
    exportMode: input.mode,
    diagnosticsEnabled: input.mode === "validation",
    builtAt: input.builtAt,
    outputFileName: input.outputFileName,
    launchPath: input.launchPath ?? "index.html",
    sourceFiles: buildContext?.sourceFiles ?? [],
    packageContents: input.packageContents,
    buildFingerprint,
    validationReady: input.preflight.ready,
  };
}

export function buildScormPackageMetadata(input: {
  course: CompiledCourse;
  mode: ScormExportMode;
  builtAt: string;
  packageContents: readonly string[];
  preflight: ScormPreflightResult;
  outputFileName: string;
  buildContext?: ScormBuildContext | null;
  launchPath?: string;
}): ScormPackageMetadata {
  const buildManifest = buildScormBuildManifest(input);

  return {
    courseId: input.course.id,
    courseTitle: input.course.title,
    projectId: buildManifest.projectId,
    projectTitle: buildManifest.projectTitle,
    projectVersion: buildManifest.projectVersion,
    templateId: buildManifest.templateId,
    templateTitle: buildManifest.templateTitle,
    variantId: buildManifest.variantId,
    variantTitle: buildManifest.variantTitle,
    themeId: input.course.theme.id,
    themeName: input.course.theme.name,
    themeVersion: input.course.theme.version,
    themeTokens: buildThemeTokenSummary(input.course.theme),
    exportMode: input.mode,
    diagnosticsEnabled: input.mode === "validation",
    builtAt: input.builtAt,
    buildFingerprint: buildManifest.buildFingerprint,
    outputFileName: input.outputFileName,
    launchPath: input.launchPath ?? "index.html",
    packageContents: input.packageContents,
    preflight: input.preflight,
  };
}

export function buildScormExportPreview(
  course: CompiledCourse,
  options: ScormExportOptions = {}
): {
  metadata: ScormPackageMetadata;
  validationNotes: string;
} {
  const mode = options.mode ?? "standard";
  const builtAt = options.builtAt ?? new Date().toISOString();
  const exportCourse = options.themePack
    ? applyThemePackToCourse(course, options.themePack, {
        assetMode: "bundle",
      })
    : course;
  const outputFileName = buildScormFileName(course, {
    mode,
    buildContext: options.buildContext,
  });
  const packageContents = buildScormPackageContents(mode, options.themePack ?? null);
  const manifest = buildScormManifest(exportCourse);
  const preflight = runScormExportPreflight({
    course: exportCourse,
    manifest,
    packageContents,
    exportMode: mode,
  });

  return {
    metadata: buildScormPackageMetadata({
      course: exportCourse,
      mode,
      builtAt,
      packageContents,
      preflight,
      outputFileName,
      buildContext: options.buildContext,
    }),
    validationNotes: buildValidationNotesText({
      builtAt,
      courseId: exportCourse.id,
      courseTitle: exportCourse.title,
      diagnosticsEnabled: mode === "validation",
      exportMode: mode,
      catalog: options.validationCatalog,
    }),
  };
}

export function buildScormExportPlan(
  course: CompiledCourse,
  options: ScormExportOptions = {}
): {
  artifacts: readonly ScormPackageArtifact[];
  metadata: ScormPackageMetadata;
  validationNotes: string;
  buildManifest: ScormBuildManifest;
} {
  const mode = options.mode ?? "standard";
  const builtAt = options.builtAt ?? new Date().toISOString();
  const diagnosticsEnabled = mode === "validation";
  const exportCourse = options.themePack
    ? applyThemePackToCourse(course, options.themePack, {
        assetMode: "bundle",
      })
    : course;
  const manifest = buildScormManifest(exportCourse);
  const runtimeHtml = buildScormRuntimeHtml(exportCourse.title);
  const runtimeCss = buildScormRuntimeStyles();
  const themeCss = buildThemeStylesheet(exportCourse.theme);
  const runtimeJs = buildScormRuntimeScript({
    builtAt,
    courseId: exportCourse.id,
    courseTitle: exportCourse.title,
    diagnosticsEnabled,
    exportMode: mode,
  });
  const validationNotes = buildValidationNotesText({
    builtAt,
    courseId: exportCourse.id,
    courseTitle: exportCourse.title,
    diagnosticsEnabled,
    exportMode: mode,
    catalog: options.validationCatalog,
  });

  const initialPackageContents = buildScormPackageContents(mode, options.themePack ?? null);
  const preflight = runScormExportPreflight({
    course: exportCourse,
    manifest,
    packageContents: initialPackageContents,
    exportMode: mode,
  });
  const outputFileName = buildScormFileName(course, {
    mode,
    buildContext: options.buildContext,
  });
  const buildManifest = buildScormBuildManifest({
    course: exportCourse,
    mode,
    builtAt,
    packageContents: initialPackageContents,
    preflight,
    outputFileName,
    buildContext: options.buildContext,
  });

  const artifacts: ScormPackageArtifact[] = [
    {
      path: SCORM_PACKAGE_CONTENTS[0],
      contents: manifest,
    },
    {
      path: SCORM_PACKAGE_CONTENTS[1],
      contents: runtimeHtml,
    },
    {
      path: SCORM_PACKAGE_CONTENTS[2],
      contents: JSON.stringify(exportCourse, null, 2),
    },
    {
      path: SCORM_PACKAGE_CONTENTS[3],
      contents: runtimeCss,
    },
    {
      path: SCORM_PACKAGE_CONTENTS[4],
      contents: themeCss,
    },
    {
      path: SCORM_PACKAGE_CONTENTS[5],
      contents: runtimeJs,
    },
    {
      path: SCORM_PACKAGE_CONTENTS[6],
      contents: JSON.stringify(buildManifest, null, 2),
    },
  ];

  if (options.themePack) {
    options.themePack.bundleFiles.forEach((asset) => {
      artifacts.push({
        path: asset.bundlePath,
        contents: asset.base64,
        base64: true,
      });
    });
  }

  if (mode === "validation") {
    // Validation builds intentionally carry the checklist alongside the package.
    artifacts.push({
      path: "validation-notes.txt",
      contents: validationNotes,
    });
  }

  const packageContents = artifacts.map((artifact) => artifact.path);

  return {
    artifacts,
    metadata: buildScormPackageMetadata({
      course: exportCourse,
      mode,
      builtAt,
      packageContents,
      preflight,
      outputFileName,
      buildContext: options.buildContext,
    }),
    validationNotes,
    buildManifest: {
      ...buildManifest,
      packageContents,
    },
  };
}

export async function exportCourseAsScormZip(
  course: CompiledCourse,
  options: ScormExportOptions = {}
): Promise<ScormExportBundle> {
  const plan = buildScormExportPlan(course, options);
  const zip = new JSZip();

  plan.artifacts.forEach((artifact) => {
    zip.file(
      artifact.path,
      artifact.contents,
      artifact.base64 ? { base64: true } : undefined
    );
  });

  return {
    blob: await zip.generateAsync({ type: "blob" }),
    fileName: plan.metadata.outputFileName,
    artifacts: plan.artifacts,
    metadata: plan.metadata,
    validationNotes: plan.validationNotes,
    buildManifest: plan.buildManifest,
  };
}
