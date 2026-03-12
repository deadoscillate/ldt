import type { CSSProperties } from "react";

import type { CompiledCourse, CompiledTheme } from "@/lib/course/types";
import type { ThemePack } from "@/lib/theme/schema";

export interface ThemeTokenSummaryItem {
  label: string;
  value: string;
}

function resolveLogoPath(
  themePack: ThemePack,
  assetMode: "preview" | "bundle"
): string | null {
  if (assetMode === "preview") {
    return themePack.logoPreviewUrl;
  }

  return themePack.logoBundlePath;
}

export function applyThemePackToCourse(
  course: CompiledCourse,
  themePack: ThemePack,
  options: {
    assetMode?: "preview" | "bundle";
  } = {}
): CompiledCourse {
  const assetMode = options.assetMode ?? "preview";

  return {
    ...course,
    theme: {
      id: themePack.id,
      name: themePack.name,
      description: themePack.description,
      author: themePack.author,
      version: themePack.version,
      runtimeCompatibility: themePack.runtimeCompatibility,
      supportedLayouts: [...themePack.supportedLayouts],
      primary: themePack.tokens.colors.primary,
      secondary: themePack.tokens.colors.secondary,
      accent: themePack.tokens.colors.accent,
      background: themePack.tokens.colors.background,
      surface: themePack.tokens.colors.surface,
      surfaceStrong: themePack.tokens.colors.surfaceStrong,
      text: themePack.tokens.colors.text,
      mutedText: themePack.tokens.colors.mutedText,
      border: themePack.tokens.colors.border,
      success: themePack.tokens.colors.success,
      danger: themePack.tokens.colors.danger,
      font: themePack.tokens.typography.bodyFont,
      headingFont: themePack.tokens.typography.headingFont,
      baseSize: themePack.tokens.typography.baseSize,
      headingScale: themePack.tokens.typography.headingScale,
      panelPadding: themePack.tokens.spacing.panelPadding,
      sectionGap: themePack.tokens.spacing.sectionGap,
      cardGap: themePack.tokens.spacing.cardGap,
      buttonRadius: themePack.tokens.components.buttonRadius,
      cardRadius: themePack.tokens.components.cardRadius,
      borderStyle: themePack.tokens.components.borderStyle,
      logo: resolveLogoPath(themePack, assetMode),
      fontFaces: themePack.fontAssets.map((fontAsset) => ({
        id: fontAsset.id,
        family: fontAsset.family,
        source: fontAsset.bundlePath,
        weight: fontAsset.weight,
        style: fontAsset.style,
        format: fontAsset.format,
      })),
    },
  };
}

export function buildThemeStyleVariables(
  theme: CompiledTheme
): CSSProperties & Record<string, string> {
  const style: CSSProperties & Record<string, string> = {};

  const variableEntries: Array<[string, string | number | null]> = [
    ["--course-primary", theme.primary],
    ["--course-secondary", theme.secondary],
    ["--course-accent", theme.accent],
    ["--course-background", theme.background],
    ["--course-surface", theme.surface],
    ["--course-surface-strong", theme.surfaceStrong],
    ["--course-text", theme.text],
    ["--course-muted-text", theme.mutedText],
    ["--course-border", theme.border],
    ["--course-success", theme.success],
    ["--course-danger", theme.danger],
    ["--course-font", theme.font],
    ["--course-heading-font", theme.headingFont],
    ["--course-base-size", theme.baseSize],
    ["--course-panel-padding", theme.panelPadding],
    ["--course-section-gap", theme.sectionGap],
    ["--course-card-gap", theme.cardGap],
    ["--course-button-radius", theme.buttonRadius],
    ["--course-card-radius", theme.cardRadius],
    ["--course-border-style", theme.borderStyle],
  ];

  variableEntries.forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      style[key] = String(value);
    }
  });

  if (theme.headingScale !== null && theme.headingScale !== undefined) {
    style["--course-heading-scale"] = String(theme.headingScale);
  }

  return style;
}

export function buildThemeStylesheet(theme: CompiledTheme): string {
  const declarations = Object.entries(buildThemeStyleVariables(theme))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  const fontFaceCss = theme.fontFaces
    .map(
      (fontFace) => `@font-face {
  font-family: "${fontFace.family}";
  src: url("${fontFace.source.replace(/^assets\//, "")}") format("${fontFace.format}");
  font-weight: ${fontFace.weight};
  font-style: ${fontFace.style};
  font-display: swap;
}`
    )
    .join("\n\n");

  return `${fontFaceCss ? `${fontFaceCss}\n\n` : ""}:root {\n${declarations}\n}\n`;
}

export function buildThemeTokenSummary(theme: CompiledTheme): ThemeTokenSummaryItem[] {
  return [
    {
      label: "Primary color",
      value: theme.primary ?? "Default",
    },
    {
      label: "Accent color",
      value: theme.accent ?? "Default",
    },
    {
      label: "Body font",
      value: theme.font ?? "Default",
    },
    {
      label: "Heading font",
      value: theme.headingFont ?? "Default",
    },
    {
      label: "Card radius",
      value: theme.cardRadius ?? "Default",
    },
    {
      label: "Panel padding",
      value: theme.panelPadding ?? "Default",
    },
  ];
}
