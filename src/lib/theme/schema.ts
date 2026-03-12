import yaml from "js-yaml";
import { z, ZodError } from "zod";

import { COURSE_LAYOUT_TYPES, type CourseLayoutType } from "@/lib/course/types";

export const THEME_RUNTIME_COMPATIBILITY = "1.x";
export const THEME_ASSET_BUNDLE_ROOT = "assets/themes";

export interface ThemeColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  danger: string;
}

export interface ThemeTypographyTokens {
  bodyFont: string;
  headingFont: string;
  baseSize: string;
  headingScale: number;
}

export interface ThemeSpacingTokens {
  panelPadding: string;
  sectionGap: string;
  cardGap: string;
}

export interface ThemeComponentTokens {
  buttonRadius: string;
  cardRadius: string;
  borderStyle: string;
}

export interface ThemeTokenDocument {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  spacing: ThemeSpacingTokens;
  components: ThemeComponentTokens;
}

export interface ThemeFontAssetDocument {
  id: string;
  family: string;
  source: string;
  weight: string;
  style: string;
  format: string;
}

export interface ThemePackConfig {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  runtimeCompatibility: string;
  supportedLayouts: CourseLayoutType[];
  logoPath: string | null;
  fonts: ThemeFontAssetDocument[];
}

export interface ThemePackAssetFile {
  bundlePath: string;
  mimeType: string;
  sourcePath: string;
  base64: string;
}

export interface ThemePackFontAsset {
  id: string;
  family: string;
  sourcePath: string;
  bundlePath: string;
  weight: string;
  style: string;
  format: string;
  mimeType: string;
}

export interface ThemePack {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  runtimeCompatibility: string;
  supportedLayouts: CourseLayoutType[];
  themeYaml: string;
  tokensYaml: string;
  tokens: ThemeTokenDocument;
  logoPath: string | null;
  logoBundlePath: string | null;
  logoPreviewUrl: string | null;
  fontAssets: ThemePackFontAsset[];
  bundleFiles: ThemePackAssetFile[];
}

const colorTokenSchema = z
  .string()
  .trim()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Expected a hex color like #1f6feb."
  );
const tokenStringSchema = z.string().trim().min(1, "Value is required.");
const layoutTypeSchema = z.enum(COURSE_LAYOUT_TYPES);

const themePackDocumentSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    author: z.string().trim().min(1),
    version: z.string().trim().min(1),
    runtimeCompatibility: z.string().trim().min(1),
    supportedLayouts: z.array(layoutTypeSchema).min(1),
    assets: z
      .object({
        logo: z.string().trim().min(1).nullable().optional(),
      })
      .strict()
      .optional()
      .default({}),
    fonts: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            family: z.string().trim().min(1),
            source: z.string().trim().min(1),
            weight: z.string().trim().min(1).optional().default("400"),
            style: z.string().trim().min(1).optional().default("normal"),
            format: z.string().trim().min(1).optional().default("woff2"),
          })
          .strict()
      )
      .optional()
      .default([]),
  })
  .strict();

const themeTokensDocumentSchema = z
  .object({
    colors: z
      .object({
        primary: colorTokenSchema,
        secondary: colorTokenSchema,
        accent: colorTokenSchema,
        background: colorTokenSchema,
        surface: colorTokenSchema,
        surfaceStrong: colorTokenSchema,
        text: colorTokenSchema,
        mutedText: colorTokenSchema,
        border: colorTokenSchema,
        success: colorTokenSchema,
        danger: colorTokenSchema,
      })
      .strict(),
    typography: z
      .object({
        bodyFont: tokenStringSchema,
        headingFont: tokenStringSchema,
        baseSize: tokenStringSchema,
        headingScale: z.coerce.number().positive(),
      })
      .strict(),
    spacing: z
      .object({
        panelPadding: tokenStringSchema,
        sectionGap: tokenStringSchema,
        cardGap: tokenStringSchema,
      })
      .strict(),
    components: z
      .object({
        buttonRadius: tokenStringSchema,
        cardRadius: tokenStringSchema,
        borderStyle: tokenStringSchema,
      })
      .strict(),
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

export function parseThemePackYaml(source: string): ThemePackConfig {
  try {
    const parsed = themePackDocumentSchema.parse(
      JSON.parse(JSON.stringify(yaml.load(source) ?? {}))
    );

    if (parsed.runtimeCompatibility !== THEME_RUNTIME_COMPATIBILITY) {
      throw new Error(
        `theme.runtimeCompatibility: Expected "${THEME_RUNTIME_COMPATIBILITY}" but received "${parsed.runtimeCompatibility}".`
      );
    }

    return {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      author: parsed.author,
      version: parsed.version,
      runtimeCompatibility: parsed.runtimeCompatibility,
      supportedLayouts: parsed.supportedLayouts,
      logoPath: parsed.assets.logo ?? null,
      fonts: parsed.fonts.map((font) => ({
        id: font.id,
        family: font.family,
        source: font.source,
        weight: font.weight,
        style: font.style,
        format: font.format,
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "theme")[0] ?? "Invalid theme pack metadata."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function parseThemeTokensYaml(source: string): ThemeTokenDocument {
  try {
    return themeTokensDocumentSchema.parse(
      JSON.parse(JSON.stringify(yaml.load(source) ?? {}))
    );
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "theme.tokens")[0] ?? "Invalid theme token file."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}
