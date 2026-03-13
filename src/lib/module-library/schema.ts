import yaml from "js-yaml";
import { z, ZodError } from "zod";

import {
  courseTemplateEntrySchema,
  type CourseTemplateEntryDocument,
  type TemplateScalarValue,
} from "@/lib/course/schema";

export interface SharedModuleDependencyReference {
  moduleId: string;
  version: string | null;
}

export interface SharedModuleRegistryEntry {
  id: string;
  version: string;
  path: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  deprecated: boolean;
}

export interface SharedModuleRegistry {
  id: string;
  title: string;
  description: string;
  modules: SharedModuleRegistryEntry[];
}

export interface SharedModuleDocument {
  id: string;
  title: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  deprecated: boolean;
  templateData: Record<string, TemplateScalarValue>;
  blocks: Record<string, CourseTemplateEntryDocument[]>;
  nodes: CourseTemplateEntryDocument[];
  metadata: Record<string, TemplateScalarValue>;
}

export interface SharedModule extends SharedModuleDocument {
  sourcePath: string;
  registry: SharedModuleRegistryEntry;
  dependencyReferences: SharedModuleDependencyReference[];
}

export interface SharedModuleLibrary {
  id: string;
  title: string;
  description: string;
  registryPath: string;
  modules: SharedModule[];
}

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Value is required.")
  .regex(
    /^[A-Za-z0-9_.-]+$/,
    "Use letters, numbers, periods, hyphens, or underscores only."
  );

const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const dateLikeSchema = z.union([z.string().trim().min(1), z.date()]).transform((value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value
);

const registryEntrySchema = z
  .object({
    id: identifierSchema,
    version: z.string().trim().min(1),
    path: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    category: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    lastUpdated: dateLikeSchema,
    deprecated: z.boolean().optional().default(false),
  })
  .strict();

const moduleRegistrySchema = z
  .object({
    id: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    modules: z.array(registryEntrySchema).min(1),
  })
  .strict();

const sharedModuleDocumentSchema: z.ZodType<SharedModuleDocument> = z
  .object({
    id: identifierSchema,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    version: z.string().trim().min(1),
    category: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    lastUpdated: dateLikeSchema,
    deprecated: z.boolean().optional().default(false),
    templateData: z.record(identifierSchema, scalarSchema).optional().default({}),
    blocks: z
      .record(
        identifierSchema,
        z
          .array(courseTemplateEntrySchema)
          .min(1, "Each module block must contain at least one entry.")
      )
      .optional()
      .default({}),
    nodes: z
      .array(courseTemplateEntrySchema)
      .min(1, "Shared modules must include at least one entry."),
    metadata: z.record(identifierSchema, scalarSchema).optional().default({}),
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

function isModuleIncludeReference(
  value: unknown
): value is { module: string; version?: string | null } {
  return typeof value === "object" && value !== null && "module" in value;
}

function collectDependencyReferences(
  entries: readonly CourseTemplateEntryDocument[],
  blocks: Record<string, CourseTemplateEntryDocument[]>,
  seenBlocks = new Set<string>()
): SharedModuleDependencyReference[] {
  const references: SharedModuleDependencyReference[] = [];

  entries.forEach((entry) => {
    if (!("include" in entry)) {
      return;
    }

    if (typeof entry.include === "string") {
      if (!blocks[entry.include] || seenBlocks.has(entry.include)) {
        return;
      }

      seenBlocks.add(entry.include);
      references.push(
        ...collectDependencyReferences(blocks[entry.include], blocks, seenBlocks)
      );
      return;
    }

    if (isModuleIncludeReference(entry.include)) {
      references.push({
        moduleId: entry.include.module,
        version: entry.include.version ?? null,
      });
    }
  });

  return references;
}

export function normalizeModuleLibraryPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function compareModuleVersions(left: string, right: string): number {
  const leftParts = left.split(/[.-]/).map((part) => {
    const asNumber = Number(part);
    return Number.isFinite(asNumber) && String(asNumber) === part ? asNumber : part;
  });
  const rightParts = right.split(/[.-]/).map((part) => {
    const asNumber = Number(part);
    return Number.isFinite(asNumber) && String(asNumber) === part ? asNumber : part;
  });
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    if (leftPart === rightPart) {
      continue;
    }

    if (typeof leftPart === "number" && typeof rightPart === "number") {
      return leftPart === rightPart ? 0 : leftPart > rightPart ? 1 : -1;
    }

    return String(leftPart).localeCompare(String(rightPart));
  }

  return 0;
}

export function parseSharedModuleRegistryYaml(source: string): SharedModuleRegistry {
  try {
    const parsed = moduleRegistrySchema.parse(yaml.load(source) ?? {});

    return {
      id: parsed.id,
      title: parsed.title,
      description: parsed.description,
      modules: parsed.modules.map((entry) => ({
        id: entry.id,
        version: entry.version,
        path: normalizeModuleLibraryPath(entry.path),
        title: entry.title,
        description: entry.description,
        category: entry.category,
        tags: entry.tags,
        lastUpdated: entry.lastUpdated,
        deprecated: entry.deprecated,
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "module-library")[0] ??
          "Invalid module registry."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function parseSharedModuleYaml(source: string): SharedModuleDocument {
  try {
    return sharedModuleDocumentSchema.parse(yaml.load(source) ?? {});
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "shared-module")[0] ??
          "Invalid shared module."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function buildSharedModule(input: {
  registry: SharedModuleRegistryEntry;
  sourcePath: string;
  source: string;
}): SharedModule {
  const document = parseSharedModuleYaml(input.source);

  return {
    ...document,
    sourcePath: normalizeModuleLibraryPath(input.sourcePath),
    registry: input.registry,
    dependencyReferences: collectDependencyReferences(
      document.nodes,
      document.blocks
    ),
  };
}
