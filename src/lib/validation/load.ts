import { readFile } from "node:fs/promises";
import path from "node:path";

import yaml from "js-yaml";

import {
  lmsValidationCatalogSchema,
  type LmsValidationCatalog,
} from "@/lib/validation/schema";

export async function loadLmsValidationCatalog(): Promise<LmsValidationCatalog> {
  const filePath = path.join(process.cwd(), "docs", "lms-validation.yaml");
  const source = await readFile(filePath, "utf8");
  const parsed = yaml.load(source);

  return lmsValidationCatalogSchema.parse(parsed);
}
