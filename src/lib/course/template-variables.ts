import yaml from "js-yaml";
import { z, ZodError } from "zod";

import type { TemplateScalarValue } from "@/lib/course/schema";

export const TEMPLATE_VARIABLE_INPUT_TYPES = [
  "text",
  "number",
  "boolean",
  "url",
  "email",
  "color",
] as const;

export type TemplateFieldInputType =
  (typeof TEMPLATE_VARIABLE_INPUT_TYPES)[number];

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  description: string;
  value: TemplateScalarValue;
  inputType: TemplateFieldInputType;
  required: boolean;
  placeholder: string;
}

export interface TemplateVariableSchemaField {
  key: string;
  inputType: TemplateFieldInputType;
  label: string;
  description: string;
  required: boolean;
  defaultValue?: TemplateScalarValue;
  placeholder: string;
}

export interface TemplateVariableSchema {
  allowAdditionalVariables: boolean;
  variables: Record<string, TemplateVariableSchemaField>;
}

interface TemplateVariableValidationResult {
  issues: string[];
  values: Record<string, TemplateScalarValue>;
}

const templateVariableTypeSchema = z.enum(TEMPLATE_VARIABLE_INPUT_TYPES);

const templateVariableSchemaFieldSchema = z
  .object({
    type: templateVariableTypeSchema,
    label: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    required: z.boolean().optional().default(true),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
    placeholder: z.string().trim().min(1).optional(),
  })
  .strict();

const templateVariableSchemaDocumentSchema = z
  .object({
    allowAdditionalVariables: z.boolean().optional().default(false),
    variables: z
      .record(
        z.string().trim().min(1, "Template variable names are required."),
        templateVariableSchemaFieldSchema
      )
      .default({}),
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

function titleCaseKey(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildFallbackPlaceholder(inputType: TemplateFieldInputType): string {
  switch (inputType) {
    case "url":
      return "https://example.com/policy";
    case "email":
      return "team@example.com";
    case "color":
      return "#1f6feb";
    case "number":
      return "10";
    case "boolean":
      return "true";
    default:
      return "";
  }
}

function defaultValueForInputType(
  inputType: TemplateFieldInputType
): TemplateScalarValue {
  switch (inputType) {
    case "number":
      return 0;
    case "boolean":
      return false;
    default:
      return "";
  }
}

function coerceTemplateValue(
  key: string,
  field: TemplateVariableSchemaField,
  value: TemplateScalarValue | undefined,
  issues: string[]
): TemplateScalarValue | undefined {
  if (value === undefined || value === null || value === "") {
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    if (field.required) {
      issues.push(`Template variable "${key}" is required.`);
    }

    return undefined;
  }

  switch (field.inputType) {
    case "number": {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      issues.push(`Template variable "${key}" must be a number.`);
      return value;
    }
    case "boolean":
      if (typeof value === "boolean") {
        return value;
      }

      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      issues.push(`Template variable "${key}" must be true or false.`);
      return value;
    case "url":
      if (typeof value !== "string") {
        issues.push(`Template variable "${key}" must be a URL.`);
        return value;
      }

      try {
        const parsedUrl = new URL(value);

        if (!parsedUrl.protocol.startsWith("http")) {
          issues.push(`Template variable "${key}" must use http or https.`);
        }
      } catch {
        issues.push(`Template variable "${key}" must be a valid URL.`);
      }

      return value;
    case "email":
      if (
        typeof value !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ) {
        issues.push(`Template variable "${key}" must be a valid email address.`);
      }

      return value;
    case "color":
      if (
        typeof value !== "string" ||
        !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
      ) {
        issues.push(`Template variable "${key}" must be a hex color like #1f6feb.`);
      }

      return value;
    case "text":
      if (typeof value !== "string") {
        issues.push(`Template variable "${key}" must be text.`);
      }

      return value;
  }
}

export function parseTemplateVariableSchemaObject(
  sourceObject: unknown,
  fallbackPath = "template-schema"
): TemplateVariableSchema {
  try {
    const document = templateVariableSchemaDocumentSchema.parse(sourceObject ?? {});

    return {
      allowAdditionalVariables: document.allowAdditionalVariables,
      variables: Object.fromEntries(
        Object.entries(document.variables).map(([key, value]) => [
          key,
          {
            key,
            inputType: value.type,
            label: value.label ?? titleCaseKey(key),
            description: value.description ?? "",
            required: value.required,
            defaultValue: value.default,
            placeholder:
              value.placeholder ?? buildFallbackPlaceholder(value.type),
          } satisfies TemplateVariableSchemaField,
        ])
      ),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        formatZodIssues(error, fallbackPath)[0] ??
          "Invalid template variable schema."
      );
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function parseTemplateVariableSchemaYaml(
  source: string
): TemplateVariableSchema {
  return parseTemplateVariableSchemaObject(yaml.load(source) ?? {}, "template-schema");
}

export function buildTemplateFieldDefinitions(
  templateData: Record<string, TemplateScalarValue>,
  variableSchema: TemplateVariableSchema | null = null
): TemplateFieldDefinition[] {
  if (!variableSchema) {
    return Object.entries(templateData).map(([key, value]) => ({
      key,
      label: titleCaseKey(key),
      description: "",
      value,
      inputType:
        typeof value === "number"
          ? "number"
          : typeof value === "boolean"
            ? "boolean"
            : "text",
      required: true,
      placeholder: "",
    }));
  }

  return Object.values(variableSchema.variables).map((field) => ({
    key: field.key,
    label: field.label,
    description: field.description,
    value:
      templateData[field.key] ??
      field.defaultValue ??
      defaultValueForInputType(field.inputType),
    inputType: field.inputType,
    required: field.required,
    placeholder: field.placeholder,
  }));
}

export function validateTemplateVariableValues(
  templateData: Record<string, TemplateScalarValue>,
  variableSchema: TemplateVariableSchema | null = null
): TemplateVariableValidationResult {
  if (!variableSchema) {
    return {
      issues: [],
      values: { ...templateData },
    };
  }

  const issues: string[] = [];
  const values: Record<string, TemplateScalarValue> = {};

  Object.values(variableSchema.variables).forEach((field) => {
    const coercedValue = coerceTemplateValue(
      field.key,
      field,
      templateData[field.key],
      issues
    );

    if (coercedValue !== undefined) {
      values[field.key] = coercedValue;
    }
  });

  const unknownKeys = Object.keys(templateData).filter(
    (key) => !(key in variableSchema.variables)
  );

  if (!variableSchema.allowAdditionalVariables) {
    unknownKeys.forEach((key) => {
      issues.push(`Template variable "${key}" is not declared in this template schema.`);
    });
  } else {
    unknownKeys.forEach((key) => {
      values[key] = templateData[key]!;
    });
  }

  return {
    issues,
    values,
  };
}
