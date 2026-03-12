import yaml from "js-yaml";
import { z, ZodError } from "zod";

import type {
  TemplatePackTemplate,
  TemplatePackVariant,
} from "@/lib/course/template-pack";
import type { ThemePack } from "@/lib/theme/schema";

export const COURSE_PROJECT_BUILD_TARGETS = ["scorm12"] as const;
export type CourseProjectBuildTarget =
  (typeof COURSE_PROJECT_BUILD_TARGETS)[number];

export interface CourseProjectTemplateConfig {
  id: string;
  title: string;
  description: string;
  recommendedUseCase: string;
  templatePath: string;
  schemaPath: string;
  readmePath: string;
}

export interface CourseProjectVariantConfig {
  id: string;
  templateId: string;
  title: string;
  description: string;
  sourcePath: string;
}

export interface CourseProjectThemeConfig {
  id: string;
  themePath: string;
  tokensPath: string;
  assetsDirectory: string | null;
}

export interface CourseProjectConfig {
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  defaultTemplateId: string;
  defaultVariantId: string;
  defaultThemeId: string;
  buildTargets: CourseProjectBuildTarget[];
  readmePath: string;
  gitignorePath: string | null;
  buildDirectory: string;
  assetsDirectory: string;
  templates: CourseProjectTemplateConfig[];
  variants: CourseProjectVariantConfig[];
  themes: CourseProjectThemeConfig[];
}

export interface ProjectValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

export interface ProjectValidationResult {
  ready: boolean;
  checks: ProjectValidationCheck[];
}

export interface CourseProjectSourceFile {
  path: string;
  contents: string;
}

export interface CourseProjectBinaryFile {
  path: string;
  base64: string;
  mimeType: string;
}

export interface CourseProject {
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  defaultTemplateId: string;
  defaultVariantId: string;
  defaultThemeId: string;
  buildTargets: CourseProjectBuildTarget[];
  buildDirectory: string;
  assetsDirectory: string;
  readme: string;
  gitignore: string;
  templates: TemplatePackTemplate[];
  themes: ThemePack[];
  validation: ProjectValidationResult;
  sourceFiles: CourseProjectSourceFile[];
  binaryFiles: CourseProjectBinaryFile[];
}

const identifierSchema = z.string().trim().min(1);
const buildTargetSchema = z.enum(COURSE_PROJECT_BUILD_TARGETS);

const courseProjectTemplateSchema = z
  .object({
    id: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    recommendedUseCase: z.string().trim().min(1),
    template: z.string().trim().min(1),
    schema: z.string().trim().min(1),
    readme: z.string().trim().min(1),
  })
  .strict();

const courseProjectVariantSchema = z
  .object({
    id: identifierSchema,
    templateId: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    source: z.string().trim().min(1),
  })
  .strict();

const courseProjectThemeSchema = z
  .object({
    id: identifierSchema,
    theme: z.string().trim().min(1),
    tokens: z.string().trim().min(1),
    assetsDirectory: z.string().trim().min(1).optional().nullable(),
  })
  .strict();

const courseProjectDocumentSchema = z
  .object({
    id: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    version: z.string().trim().min(1),
    author: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
    defaultTemplateId: identifierSchema,
    defaultVariantId: identifierSchema,
    defaultThemeId: identifierSchema,
    buildTargets: z.array(buildTargetSchema).min(1),
    readme: z.string().trim().min(1),
    gitignore: z.string().trim().min(1).optional().nullable(),
    buildDirectory: z.string().trim().min(1).optional().default("build"),
    assetsDirectory: z.string().trim().min(1).optional().default("assets"),
    templates: z.array(courseProjectTemplateSchema).min(1),
    variants: z.array(courseProjectVariantSchema).min(1),
    themes: z.array(courseProjectThemeSchema).min(1),
  })
  .strict();

function formatZodIssues(error: ZodError, fallbackPath: string): string[] {
  return error.issues.map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : fallbackPath;

    return `${path}: ${issue.message}`;
  });
}

export function parseCourseProjectYaml(source: string): CourseProjectConfig {
  try {
    const parsed = courseProjectDocumentSchema.parse(
      JSON.parse(JSON.stringify(yaml.load(source) ?? {}))
    );

    return {
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      version: parsed.version,
      author: parsed.author,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      defaultTemplateId: parsed.defaultTemplateId,
      defaultVariantId: parsed.defaultVariantId,
      defaultThemeId: parsed.defaultThemeId,
      buildTargets: parsed.buildTargets,
      readmePath: parsed.readme,
      gitignorePath: parsed.gitignore ?? null,
      buildDirectory: parsed.buildDirectory,
      assetsDirectory: parsed.assetsDirectory,
      templates: parsed.templates.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        recommendedUseCase: template.recommendedUseCase,
        templatePath: template.template,
        schemaPath: template.schema,
        readmePath: template.readme,
      })),
      variants: parsed.variants.map((variant) => ({
        id: variant.id,
        templateId: variant.templateId,
        title: variant.title,
        description: variant.description,
        sourcePath: variant.source,
      })),
      themes: parsed.themes.map((theme) => ({
        id: theme.id,
        themePath: theme.theme,
        tokensPath: theme.tokens,
        assetsDirectory: theme.assetsDirectory ?? null,
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "course-project")[0] ??
          "Invalid course project definition."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}
