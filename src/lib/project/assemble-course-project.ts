import {
  parseTemplateVariantYaml,
  type TemplatePackTemplate,
  type TemplatePackVariant,
} from "@/lib/course/template-pack";
import {
  parseCourseLogicTestSuiteYaml,
  type CourseLogicTestSuite,
} from "@/lib/course-tests/schema";
import { parseTemplateVariableSchemaYaml } from "@/lib/course/template-variables";
import {
  THEME_ASSET_BUNDLE_ROOT,
  parseThemePackYaml,
  parseThemeTokensYaml,
  type ThemePack,
  type ThemePackAssetFile,
} from "@/lib/theme/schema";
import {
  parseCourseProjectYaml,
  type CourseProject,
  type CourseProjectBinaryFile,
  type CourseProjectSourceFile,
} from "@/lib/project/schema";
import { validateCourseProject } from "@/lib/project/validation";

export function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function defaultGitignoreContents(): string {
  return [
    "# Course-as-Code build artifacts",
    "/build",
    "*.zip",
    "*.tmp",
  ].join("\n");
}

function readSourceFile(
  sourceFiles: Map<string, string>,
  filePath: string
): string {
  const normalizedPath = normalizeProjectPath(filePath);
  const contents = sourceFiles.get(normalizedPath);

  if (contents === undefined) {
    throw new Error(`Project source is missing required file "${normalizedPath}".`);
  }

  return contents;
}

function buildThemeAssetMap(
  binaryFiles: readonly CourseProjectBinaryFile[],
  themeDirectory: string
): Record<string, { base64: string; mimeType: string }> {
  const normalizedThemeDirectory = normalizeProjectPath(themeDirectory);

  return Object.fromEntries(
    binaryFiles
      .filter((file) => file.path.startsWith(`${normalizedThemeDirectory}/`))
      .map((file) => [
        file.path.slice(normalizedThemeDirectory.length + 1),
        {
          base64: file.base64,
          mimeType: file.mimeType,
        },
      ])
  );
}

function joinPosix(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .join("/")
    .replace(/\/+/g, "/");
}

function buildThemeBundlePath(packId: string, sourcePath: string): string {
  return joinPosix(THEME_ASSET_BUNDLE_ROOT, packId, sourcePath);
}

function buildPreviewUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function buildInlineThemePack(input: {
  themeYaml: string;
  tokensYaml: string;
  sourceAssetFiles: Record<string, { base64: string; mimeType: string }>;
}): ThemePack {
  const config = parseThemePackYaml(input.themeYaml);
  const tokens = parseThemeTokensYaml(input.tokensYaml);
  const assetFiles = new Map<string, ThemePackAssetFile>();

  function ensureAsset(
    sourcePath: string | null | undefined
  ): ThemePackAssetFile | null {
    if (!sourcePath) {
      return null;
    }

    const normalizedSourcePath = normalizeProjectPath(sourcePath);
    const sourceAsset = input.sourceAssetFiles[normalizedSourcePath];

    if (!sourceAsset) {
      return null;
    }

    const existingAsset = assetFiles.get(normalizedSourcePath);

    if (existingAsset) {
      return existingAsset;
    }

    const asset = {
      sourcePath: normalizedSourcePath,
      bundlePath: buildThemeBundlePath(config.id, normalizedSourcePath),
      mimeType: sourceAsset.mimeType,
      base64: sourceAsset.base64,
    };

    assetFiles.set(normalizedSourcePath, asset);
    return asset;
  }

  const logoAsset = ensureAsset(config.logoPath);
  const fontAssets = config.fonts.map((font) => {
    const asset = ensureAsset(font.source);

    if (!asset) {
      throw new Error(
        `Theme pack "${config.id}" references missing font asset "${font.source}".`
      );
    }

    return {
      id: font.id,
      family: font.family,
      sourcePath: asset.sourcePath,
      bundlePath: asset.bundlePath,
      weight: font.weight,
      style: font.style,
      format: font.format,
      mimeType: asset.mimeType,
    };
  });

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    author: config.author,
    version: config.version,
    runtimeCompatibility: config.runtimeCompatibility,
    supportedLayouts: config.supportedLayouts,
    themeYaml: input.themeYaml,
    tokensYaml: input.tokensYaml,
    tokens,
    logoPath: logoAsset?.sourcePath ?? null,
    logoBundlePath: logoAsset?.bundlePath ?? null,
    logoPreviewUrl: logoAsset
      ? buildPreviewUrl(logoAsset.mimeType, logoAsset.base64)
      : null,
    fontAssets,
    bundleFiles: [...assetFiles.values()].sort((leftAsset, rightAsset) =>
      leftAsset.bundlePath.localeCompare(rightAsset.bundlePath)
    ),
  };
}

export async function buildCourseProjectFromFileEntries(input: {
  projectRoot: string;
  sourceFiles: readonly CourseProjectSourceFile[];
  binaryFiles: readonly CourseProjectBinaryFile[];
}): Promise<CourseProject> {
  const sourceFilesMap = new Map(
    input.sourceFiles.map((file) => [normalizeProjectPath(file.path), file.contents])
  );
  const projectYaml = readSourceFile(sourceFilesMap, "project.yaml");
  const config = parseCourseProjectYaml(projectYaml);
  const readme = readSourceFile(sourceFilesMap, config.readmePath);
  const gitignore = config.gitignorePath
    ? readSourceFile(sourceFilesMap, config.gitignorePath)
    : defaultGitignoreContents();

  const templates: TemplatePackTemplate[] = await Promise.all(
    config.templates.map(async (templateConfig) => {
      const yaml = readSourceFile(sourceFilesMap, templateConfig.templatePath);
      const schemaYaml = readSourceFile(sourceFilesMap, templateConfig.schemaPath);
      const templateReadme = readSourceFile(sourceFilesMap, templateConfig.readmePath);

      const variants: TemplatePackVariant[] = await Promise.all(
        config.variants
          .filter((variantConfig) => variantConfig.templateId === templateConfig.id)
          .map(async (variantConfig) => {
            const valuesYaml = readSourceFile(sourceFilesMap, variantConfig.sourcePath);
            const variantDocument = parseTemplateVariantYaml(valuesYaml);

            return {
              id: variantDocument.id,
              templateId: variantDocument.templateId,
              title: variantDocument.title,
              description: variantDocument.description ?? "",
              notes: variantDocument.notes ?? "",
              values: variantDocument.values,
              valuesYaml,
            };
          })
      );

      return {
        id: templateConfig.id,
        title: templateConfig.title,
        description: templateConfig.description,
        recommendedUseCase: templateConfig.recommendedUseCase,
        yaml,
        schemaYaml,
        readme: templateReadme,
        variableSchema: parseTemplateVariableSchemaYaml(schemaYaml),
        variants,
      };
    })
  );

  const themes: ThemePack[] = await Promise.all(
    config.themes.map(async (themeConfig) => {
      const themeYaml = readSourceFile(sourceFilesMap, themeConfig.themePath);
      const tokensYaml = readSourceFile(sourceFilesMap, themeConfig.tokensPath);
      const themeDirectory = normalizeProjectPath(themeConfig.themePath)
        .split("/")
        .slice(0, -1)
        .join("/");

      return buildInlineThemePack({
        themeYaml,
        tokensYaml,
        sourceAssetFiles: buildThemeAssetMap(input.binaryFiles, themeDirectory),
      });
    })
  );

  const logicTestSuites: CourseLogicTestSuite[] = [];
  const logicTestLoadIssues: string[] = [];
  const normalizedTestsDirectory = normalizeProjectPath(config.testsDirectory);

  input.sourceFiles
    .filter((file) => {
      const normalizedPath = normalizeProjectPath(file.path);

      return (
        normalizedPath.startsWith(`${normalizedTestsDirectory}/`) &&
        (normalizedPath.endsWith(".yaml") || normalizedPath.endsWith(".yml"))
      );
    })
    .sort((leftFile, rightFile) => leftFile.path.localeCompare(rightFile.path))
    .forEach((file) => {
      try {
        logicTestSuites.push(
          parseCourseLogicTestSuiteYaml({
            source: file.contents,
            sourcePath: normalizeProjectPath(file.path),
          })
        );
      } catch (error) {
        logicTestLoadIssues.push(
          error instanceof Error
            ? error.message
            : `Logic test suite "${file.path}" could not be parsed.`
        );
      }
    });

  const project: CourseProject = {
    id: config.id,
    title: config.title,
    description: config.description,
    version: config.version,
    author: config.author,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    defaultTemplateId: config.defaultTemplateId,
    defaultVariantId: config.defaultVariantId,
    defaultThemeId: config.defaultThemeId,
    buildTargets: config.buildTargets,
    buildDirectory: config.buildDirectory,
    assetsDirectory: config.assetsDirectory,
    testsDirectory: config.testsDirectory,
    readme,
    gitignore,
    templates,
    themes,
    logicTestSuites,
    logicTestLoadIssues,
    validation: {
      ready: false,
      checks: [],
    },
    sourceFiles: [...input.sourceFiles].sort((leftFile, rightFile) =>
      leftFile.path.localeCompare(rightFile.path)
    ),
    binaryFiles: [...input.binaryFiles].sort((leftFile, rightFile) =>
      leftFile.path.localeCompare(rightFile.path)
    ),
  };

  project.validation = validateCourseProject({
    id: project.id,
    defaultTemplateId: project.defaultTemplateId,
    defaultVariantId: project.defaultVariantId,
    defaultThemeId: project.defaultThemeId,
    buildTargets: project.buildTargets,
    templates: project.templates.map((template) => ({
      id: template.id,
      variants: template.variants.map((variant) => ({
        id: variant.id,
        templateId: variant.templateId,
      })),
    })),
    themes: project.themes.map((theme) => ({
      id: theme.id,
      logoPath: theme.logoPath,
      logoBundlePath: theme.logoBundlePath,
    })),
    sourceFiles: project.sourceFiles.map((file) => file.path),
    binaryFiles: project.binaryFiles.map((file) => file.path),
    buildDirectory: project.buildDirectory,
  });

  return project;
}
