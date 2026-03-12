import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildTemplatePack,
  parseTemplatePackYaml,
  parseTemplateVariantYaml,
  type TemplatePack,
} from "@/lib/course/template-pack";

export async function loadTemplatePacks(): Promise<TemplatePack[]> {
  const templatePackRoot = path.join(process.cwd(), "template-packs");
  const packDirectories = await readdir(templatePackRoot, {
    withFileTypes: true,
  });

  const packs = await Promise.all(
    packDirectories
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const packDirectory = path.join(templatePackRoot, entry.name);
        const packSource = await readFile(path.join(packDirectory, "pack.yaml"), "utf8");
        const packConfig = parseTemplatePackYaml(packSource);

        const [readme, templates, variants] = await Promise.all([
          readFile(path.join(packDirectory, packConfig.readmePath), "utf8"),
          Promise.all(
            packConfig.templates.map(async (template) => ({
              id: template.id,
              yaml: await readFile(
                path.resolve(packDirectory, template.templatePath),
                "utf8"
              ),
              schemaYaml: await readFile(
                path.resolve(packDirectory, template.schemaPath),
                "utf8"
              ),
              readme: await readFile(
                path.resolve(packDirectory, template.readmePath),
                "utf8"
              ),
            }))
          ),
          Promise.all(
            packConfig.variants.map(async (variant) => {
              const valuesYaml = await readFile(
                path.resolve(packDirectory, variant.sourcePath),
                "utf8"
              );

              return {
                document: parseTemplateVariantYaml(valuesYaml),
                valuesYaml,
              };
            })
          ),
        ]);

        return buildTemplatePack({
          pack: packConfig,
          readme,
          templates,
          variants,
        });
      })
  );

  return packs.sort((leftPack, rightPack) => leftPack.title.localeCompare(rightPack.title));
}
