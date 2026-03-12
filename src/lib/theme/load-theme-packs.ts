import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  THEME_ASSET_BUNDLE_ROOT,
  parseThemePackYaml,
  parseThemeTokensYaml,
  type ThemePack,
  type ThemePackAssetFile,
} from "@/lib/theme/schema";

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

function buildBundlePath(
  packId: string,
  sourcePath: string,
  bundleRoot = THEME_ASSET_BUNDLE_ROOT
): string {
  return path.posix.join(
    bundleRoot,
    packId,
    sourcePath.replace(/\\/g, "/")
  );
}

function buildPreviewUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

async function loadAssetFile(input: {
  packDirectory: string;
  packId: string;
  sourcePath: string;
  bundleRoot?: string;
}): Promise<ThemePackAssetFile> {
  const resolvedSourcePath = path.resolve(input.packDirectory, input.sourcePath);
  const contents = await readFile(resolvedSourcePath);
  const mimeType = mimeTypeForAsset(input.sourcePath);

  return {
    sourcePath: input.sourcePath.replace(/\\/g, "/"),
    bundlePath: buildBundlePath(
      input.packId,
      input.sourcePath,
      input.bundleRoot
    ),
    mimeType,
    base64: contents.toString("base64"),
  };
}

export async function loadThemePackFromDirectory(
  packDirectory: string,
  options: {
    bundleRoot?: string;
  } = {}
): Promise<ThemePack> {
  const [themeYaml, tokensYaml] = await Promise.all([
    readFile(path.join(packDirectory, "theme.yaml"), "utf8"),
    readFile(path.join(packDirectory, "tokens.yaml"), "utf8"),
  ]);
  return createThemePackFromSources({
    packDirectory,
    themeYaml,
    tokensYaml,
    bundleRoot: options.bundleRoot,
  });
}

export async function createThemePackFromSources(input: {
  packDirectory: string;
  themeYaml: string;
  tokensYaml: string;
  bundleRoot?: string;
  sourceAssetFiles?: Record<
    string,
    {
      base64: string;
      mimeType: string;
    }
  >;
}): Promise<ThemePack> {
  const config = parseThemePackYaml(input.themeYaml);
  const tokens = parseThemeTokensYaml(input.tokensYaml);
  const assetFiles = new Map<string, ThemePackAssetFile>();

  async function ensureAsset(
    sourcePath: string | null | undefined
  ): Promise<ThemePackAssetFile | null> {
    if (!sourcePath) {
      return null;
    }

    const normalizedSourcePath = sourcePath.replace(/\\/g, "/");
    const existingAsset = assetFiles.get(normalizedSourcePath);

    if (existingAsset) {
      return existingAsset;
    }

    const sourceAsset = input.sourceAssetFiles?.[normalizedSourcePath];
    const loadedAsset = sourceAsset
      ? {
          sourcePath: normalizedSourcePath,
          bundlePath: buildBundlePath(
            config.id,
            normalizedSourcePath,
            input.bundleRoot
          ),
          mimeType: sourceAsset.mimeType,
          base64: sourceAsset.base64,
        }
      : await loadAssetFile({
          packDirectory: input.packDirectory,
          packId: config.id,
          sourcePath: normalizedSourcePath,
          bundleRoot: input.bundleRoot,
        });

    assetFiles.set(normalizedSourcePath, loadedAsset);
    return loadedAsset;
  }

  const logoAsset = await ensureAsset(config.logoPath);
  const fontAssets = await Promise.all(
    config.fonts.map(async (font): Promise<ThemePack["fontAssets"][number]> => {
      const asset = await ensureAsset(font.source);

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
    })
  );

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

export async function loadThemePacks(): Promise<ThemePack[]> {
  const themeRoot = path.join(process.cwd(), "themes");
  const themeDirectories = await readdir(themeRoot, {
    withFileTypes: true,
  });

  const themePacks = await Promise.all(
    themeDirectories
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadThemePackFromDirectory(path.join(themeRoot, entry.name)))
  );

  return themePacks.sort((leftPack, rightPack) =>
    leftPack.name.localeCompare(rightPack.name)
  );
}
