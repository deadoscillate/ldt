import type { CourseProject, ProjectValidationCheck, ProjectValidationResult } from "@/lib/project/schema";

function createCheck(
  id: string,
  label: string,
  passed: boolean,
  details: string
): ProjectValidationCheck {
  return {
    id,
    label,
    passed,
    details,
  };
}

export function validateCourseProject(project: {
  id: string;
  defaultTemplateId: string;
  defaultVariantId: string;
  defaultThemeId: string;
  buildTargets: readonly string[];
  templates: Array<{ id: string; variants: Array<{ id: string; templateId: string }> }>;
  themes: Array<{ id: string; logoBundlePath: string | null; logoPath: string | null }>;
  sourceFiles: readonly string[];
  binaryFiles: readonly string[];
  buildDirectory: string;
}): ProjectValidationResult {
  const templatesById = new Map(project.templates.map((template) => [template.id, template]));
  const variants = project.templates.flatMap((template) => template.variants);
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const themesById = new Map(project.themes.map((theme) => [theme.id, theme]));
  const sourceFileSet = new Set(project.sourceFiles);

  const defaultTemplateExists = templatesById.has(project.defaultTemplateId);
  const defaultVariant = variantsById.get(project.defaultVariantId);
  const defaultThemeExists = themesById.has(project.defaultThemeId);
  const variantReferencesValid = variants.every((variant) =>
    templatesById.has(variant.templateId)
  );
  const buildTargetsValid =
    project.buildTargets.length > 0 &&
    project.buildTargets.every((buildTarget) => buildTarget === "scorm12");
  const themeAssetsResolved = project.themes.every((theme) =>
    !theme.logoPath || Boolean(theme.logoBundlePath)
  );
  const requiredFilesPresent =
    sourceFileSet.has("project.yaml") &&
    sourceFileSet.has("README.md");
  const buildDirectoryConfigured = project.buildDirectory.trim().length > 0;
  const binaryAssetSummary =
    project.binaryFiles.length > 0
      ? `${project.binaryFiles.length} binary asset file${project.binaryFiles.length === 1 ? "" : "s"} loaded from project source.`
      : "No project-scoped binary assets were loaded.";

  const checks = [
    createCheck(
      "required-files",
      "Required project files present",
      requiredFilesPresent,
      requiredFilesPresent
        ? 'Project source includes "project.yaml" and "README.md".'
        : 'Project source must include "project.yaml" and "README.md".'
    ),
    createCheck(
      "build-directory",
      "Build directory configured",
      buildDirectoryConfigured,
      buildDirectoryConfigured
        ? `Build artifacts will be treated separately under "${project.buildDirectory}".`
        : "A build directory must be configured so generated artifacts stay outside source files."
    ),
    createCheck(
      "default-template",
      "Default template reference valid",
      defaultTemplateExists,
      defaultTemplateExists
        ? `Default template "${project.defaultTemplateId}" exists in project source.`
        : `Default template "${project.defaultTemplateId}" does not exist in this project.`
    ),
    createCheck(
      "default-variant",
      "Default variant reference valid",
      Boolean(defaultVariant) &&
        defaultVariant?.templateId === project.defaultTemplateId,
      defaultVariant
        ? `Default variant "${project.defaultVariantId}" resolves to template "${defaultVariant.templateId}".`
        : `Default variant "${project.defaultVariantId}" does not exist in this project.`
    ),
    createCheck(
      "default-theme",
      "Default theme reference valid",
      defaultThemeExists,
      defaultThemeExists
        ? `Default theme "${project.defaultThemeId}" exists in project source.`
        : `Default theme "${project.defaultThemeId}" does not exist in this project.`
    ),
    createCheck(
      "variant-references",
      "Template and variant references resolved",
      variantReferencesValid,
      variantReferencesValid
        ? "Every variant points at an existing template source file."
        : "At least one variant points at a missing template definition."
    ),
    createCheck(
      "theme-assets",
      "Theme asset references resolved",
      themeAssetsResolved,
      themeAssetsResolved
        ? "Theme assets referenced by the project were loaded successfully."
        : "A theme references a missing bundled asset."
    ),
    createCheck(
      "build-targets",
      "Build targets valid",
      buildTargetsValid,
      buildTargetsValid
        ? `Project build targets: ${project.buildTargets.join(", ")}.`
        : "Only the scorm12 build target is currently supported."
    ),
    createCheck(
      "project-assets",
      "Project assets loaded",
      true,
      binaryAssetSummary
    ),
  ];

  return {
    ready: checks.every((check) => check.passed),
    checks,
  };
}
