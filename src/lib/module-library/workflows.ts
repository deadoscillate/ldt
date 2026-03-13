import yaml from "js-yaml";

import type {
  CourseTemplateDocument,
  CourseTemplateEntryDocument,
  CourseTemplateNodeDocument,
  ModuleIncludeDocument,
  TemplateScalarValue,
} from "@/lib/course/schema";
import type { TemplateVariableSchema } from "@/lib/course/template-variables";

interface MutableCourseTemplateDocument extends CourseTemplateDocument {
  nodes: CourseTemplateEntryDocument[];
}

export interface SharedModuleExtractionInput {
  source: string;
  nodeId: string;
  moduleId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  version?: string;
  lastUpdated?: string;
  variableSchema?: TemplateVariableSchema | null;
}

export interface SharedModuleExtractionResult {
  nextSource: string;
  moduleSource: string;
  registryEntrySource: string;
}

function ensureCourseDocument(source: string): MutableCourseTemplateDocument {
  const parsed = yaml.load(source);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Source definition must be valid YAML before editing shared modules.");
  }

  const document = parsed as {
    nodes?: unknown[];
  };

  if (!Array.isArray(document.nodes)) {
    throw new Error('Source definition must include a top-level "nodes" array.');
  }

  return parsed as MutableCourseTemplateDocument;
}

function normalizeOverrideEntries(
  values: Record<string, TemplateScalarValue>
): Record<string, TemplateScalarValue> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return value !== null && value !== undefined;
    })
  );
}

export function insertSharedModuleIntoYaml(
  source: string,
  moduleId: string,
  version: string,
  overrides: Record<string, TemplateScalarValue> = {}
): string {
  const document = ensureCourseDocument(source);
  const normalizedOverrides = normalizeOverrideEntries(overrides);
  const nextInclude: ModuleIncludeDocument = {
    include: {
      module: moduleId,
      version,
      ...(Object.keys(normalizedOverrides).length > 0
        ? { with: normalizedOverrides }
        : {}),
    },
  };

  document.nodes.push(nextInclude);

  return yaml.dump(document, {
    lineWidth: 100,
    noRefs: true,
  });
}

function isTemplateNodeEntry(
  entry: CourseTemplateEntryDocument
): entry is CourseTemplateNodeDocument {
  return "id" in entry && "type" in entry;
}

export function extractSharedModuleFromYaml(
  input: SharedModuleExtractionInput
): SharedModuleExtractionResult {
  const document = ensureCourseDocument(input.source);
  const nodeIndex = document.nodes.findIndex(
    (entry) => isTemplateNodeEntry(entry) && entry.id === input.nodeId
  );

  if (nodeIndex === -1) {
    throw new Error(`Step "${input.nodeId}" could not be found in the top-level source nodes.`);
  }

  const entry = document.nodes[nodeIndex];

  if (!entry || !isTemplateNodeEntry(entry)) {
    throw new Error(
      `Step "${input.nodeId}" cannot be extracted because it is already an include reference.`
    );
  }

  const version = input.version?.trim() || "1.0.0";
  const lastUpdated =
    input.lastUpdated?.trim() || new Date().toISOString().slice(0, 10);
  const normalizedTags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
  const moduleDocument = {
    id: input.moduleId.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    version,
    category: input.category.trim(),
    tags: normalizedTags,
    lastUpdated,
    deprecated: false,
    ...(input.variableSchema ? { variableSchema: input.variableSchema } : {}),
    templateData: {},
    nodes: [entry],
    metadata: {
      extractedFromCourse: document.id,
      extractedFromStep: input.nodeId,
    },
  };

  document.nodes.splice(nodeIndex, 1, {
    include: {
      module: moduleDocument.id,
      version,
    },
  });

  const registryEntry = {
    id: moduleDocument.id,
    version,
    path: `modules/${moduleDocument.id}.yaml`,
    title: moduleDocument.title,
    description: moduleDocument.description,
    category: moduleDocument.category,
    tags: normalizedTags,
    lastUpdated,
    deprecated: false,
  };

  return {
    nextSource: yaml.dump(document, {
      lineWidth: 100,
      noRefs: true,
    }),
    moduleSource: yaml.dump(moduleDocument, {
      lineWidth: 100,
      noRefs: true,
    }),
    registryEntrySource: yaml.dump(registryEntry, {
      lineWidth: 100,
      noRefs: true,
    }),
  };
}
