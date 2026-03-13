import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildSharedModule,
  compareModuleVersions,
  normalizeModuleLibraryPath,
  parseSharedModuleRegistryYaml,
  type SharedModule,
  type SharedModuleLibrary,
} from "@/lib/module-library/schema";

const MODULE_LIBRARY_DIRECTORY = "module-library";
const MODULE_LIBRARY_REGISTRY = "registry.yaml";

function buildModuleKey(id: string, version: string): string {
  return `${id}@${version}`;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadModuleLibraryFromDirectory(
  directoryPath: string
): Promise<SharedModuleLibrary> {
  const registryPath = path.join(directoryPath, MODULE_LIBRARY_REGISTRY);
  const registrySource = await readFile(registryPath, "utf8");
  const registry = parseSharedModuleRegistryYaml(registrySource);
  const seenKeys = new Set<string>();

  const modules = await Promise.all(
    registry.modules.map(async (entry) => {
      const moduleKey = buildModuleKey(entry.id, entry.version);

      if (seenKeys.has(moduleKey)) {
        throw new Error(
          `Module registry defines duplicate module "${entry.id}" version "${entry.version}".`
        );
      }

      seenKeys.add(moduleKey);

      const absoluteModulePath = path.join(directoryPath, entry.path);
      if (!(await exists(absoluteModulePath))) {
        throw new Error(
          `Module registry references missing file "${normalizeModuleLibraryPath(entry.path)}".`
        );
      }

      const source = await readFile(absoluteModulePath, "utf8");
      const module = buildSharedModule({
        registry: entry,
        sourcePath: entry.path,
        source,
      });

      if (module.id !== entry.id) {
        throw new Error(
          `Module file "${entry.path}" declares id "${module.id}" but registry expects "${entry.id}".`
        );
      }

      if (module.version !== entry.version) {
        throw new Error(
          `Module file "${entry.path}" declares version "${module.version}" but registry expects "${entry.version}".`
        );
      }

      return module;
    })
  );

  return {
    id: registry.id,
    title: registry.title,
    description: registry.description,
    registryPath: normalizeModuleLibraryPath(MODULE_LIBRARY_REGISTRY),
    modules: modules.sort((leftModule, rightModule) => {
      if (leftModule.id !== rightModule.id) {
        return leftModule.id.localeCompare(rightModule.id);
      }

      return compareModuleVersions(rightModule.version, leftModule.version);
    }),
  };
}

export async function loadModuleLibrary(): Promise<SharedModuleLibrary | null> {
  const directoryPath = path.join(process.cwd(), MODULE_LIBRARY_DIRECTORY);

  if (!(await exists(directoryPath))) {
    return null;
  }

  return loadModuleLibraryFromDirectory(directoryPath);
}
