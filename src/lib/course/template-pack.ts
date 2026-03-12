import yaml from "js-yaml";
import { z, ZodError } from "zod";

import type { TemplateScalarValue } from "@/lib/course/schema";
import {
  parseTemplateVariableSchemaYaml,
  type TemplateVariableSchema,
} from "@/lib/course/template-variables";

export interface TemplatePackTemplateConfig {
  id: string;
  title: string;
  description: string;
  recommendedUseCase: string;
  templatePath: string;
  schemaPath: string;
  readmePath: string;
}

export interface TemplatePackVariantConfig {
  id: string;
  templateId: string;
  title: string;
  description: string;
  sourcePath: string;
}

export interface TemplatePackConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  recommendedUseCase: string;
  readmePath: string;
  templates: TemplatePackTemplateConfig[];
  variants: TemplatePackVariantConfig[];
}

export interface TemplatePackVariant {
  id: string;
  templateId: string;
  title: string;
  description: string;
  notes: string;
  values: Record<string, TemplateScalarValue>;
  valuesYaml: string;
}

export interface TemplatePackTemplate {
  id: string;
  title: string;
  description: string;
  recommendedUseCase: string;
  yaml: string;
  schemaYaml: string;
  readme: string;
  variableSchema: TemplateVariableSchema;
  variants: TemplatePackVariant[];
}

export interface TemplatePack {
  id: string;
  title: string;
  description: string;
  category: string;
  recommendedUseCase: string;
  readme: string;
  templates: TemplatePackTemplate[];
}

export interface TemplatePackVariantDocument {
  id: string;
  title: string;
  description?: string;
  templateId: string;
  notes?: string;
  values: Record<string, TemplateScalarValue>;
}

const templatePackTemplateSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    recommendedUseCase: z.string().trim().min(1),
    template: z.string().trim().min(1),
    schema: z.string().trim().min(1),
    readme: z.string().trim().min(1),
  })
  .strict();

const templatePackVariantSchema = z
  .object({
    id: z.string().trim().min(1),
    templateId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    source: z.string().trim().min(1),
  })
  .strict();

const templatePackDocumentSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    category: z.string().trim().min(1),
    recommendedUseCase: z.string().trim().min(1),
    readme: z.string().trim().min(1),
    templates: z.array(templatePackTemplateSchema).min(1),
    variants: z.array(templatePackVariantSchema).min(1),
  })
  .strict();

const templatePackVariantDocumentSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().optional().default(""),
    templateId: z.string().trim().min(1),
    notes: z.string().trim().optional().default(""),
    values: z.record(z.string().trim().min(1), z.union([z.string(), z.number(), z.boolean()])),
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

export function parseTemplatePackYaml(source: string): TemplatePackConfig {
  try {
    const parsed = yaml.load(source) ?? {};
    const document = templatePackDocumentSchema.parse(parsed);

    return {
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category,
      recommendedUseCase: document.recommendedUseCase,
      readmePath: document.readme,
      templates: document.templates.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        recommendedUseCase: template.recommendedUseCase,
        templatePath: template.template,
        schemaPath: template.schema,
        readmePath: template.readme,
      })),
      variants: document.variants.map((variant) => ({
        id: variant.id,
        templateId: variant.templateId,
        title: variant.title,
        description: variant.description,
        sourcePath: variant.source,
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "template-pack")[0] ?? "Invalid template pack."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function parseTemplateVariantYaml(
  source: string
): TemplatePackVariantDocument {
  try {
    const parsed = yaml.load(source) ?? {};
    return templatePackVariantDocumentSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, "template-variant")[0] ??
          "Invalid template variant."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function buildTemplatePack(input: {
  pack: TemplatePackConfig;
  readme: string;
  templates: Array<{
    id: string;
    yaml: string;
    schemaYaml: string;
    readme: string;
  }>;
  variants: Array<{
    document: TemplatePackVariantDocument;
    valuesYaml: string;
  }>;
}): TemplatePack {
  const templatesById = Object.fromEntries(
    input.templates.map((template) => [template.id, template])
  );

  return {
    id: input.pack.id,
    title: input.pack.title,
    description: input.pack.description,
    category: input.pack.category,
    recommendedUseCase: input.pack.recommendedUseCase,
    readme: input.readme,
    templates: input.pack.templates.map((templateConfig) => {
      const templateSource = templatesById[templateConfig.id];

      if (!templateSource) {
        throw new Error(
          `Template pack "${input.pack.id}" is missing template "${templateConfig.id}".`
        );
      }

      const matchingVariants = input.variants
        .filter((variant) => variant.document.templateId === templateConfig.id)
        .map((variant) => ({
          id: variant.document.id,
          templateId: variant.document.templateId,
          title: variant.document.title,
          description: variant.document.description ?? "",
          notes: variant.document.notes ?? "",
          values: variant.document.values,
          valuesYaml: variant.valuesYaml,
        }));

      return {
        id: templateConfig.id,
        title: templateConfig.title,
        description: templateConfig.description,
        recommendedUseCase: templateConfig.recommendedUseCase,
        yaml: templateSource.yaml,
        schemaYaml: templateSource.schemaYaml,
        readme: templateSource.readme,
        variableSchema: parseTemplateVariableSchemaYaml(templateSource.schemaYaml),
        variants: matchingVariants,
      };
    }),
  };
}
