import yaml from "js-yaml";
import { z, ZodError } from "zod";

import type { TemplateScalarValue } from "@/lib/course/schema";

export const SOURCE_PROJECT_FILE_NAMES = [
  "course.yaml",
  "template-data.yaml",
  "README.md",
] as const;

export interface DuplicatedTemplateDraft {
  courseYaml: string;
  templateData: Record<string, TemplateScalarValue>;
  sourceLabel: string;
  suggestedProjectDirectory: string;
}

export interface DuplicatedVariantDraft {
  title: string;
  variantId: string;
  values: Record<string, TemplateScalarValue>;
  sourceLabel: string;
  suggestedFileName: string;
}

const templateDataFileSchema = z.record(
  z.string().trim().min(1, "Template variable names are required."),
  z.union([z.string(), z.number(), z.boolean()])
);

function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : "template-data";

    return `${path}: ${issue.message}`;
  });
}

function safeSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "course-variant";
}

export function parseTemplateDataYaml(
  source: string
): Record<string, TemplateScalarValue> {
  if (!source.trim()) {
    return {};
  }

  try {
    const parsed = yaml.load(source);

    if (parsed === undefined || parsed === null) {
      return {};
    }

    return templateDataFileSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatZodIssues(error)[0] ?? "Invalid template data YAML.");
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export function serializeTemplateDataYaml(
  values: Record<string, TemplateScalarValue>
): string {
  return yaml.dump(values, {
    noRefs: true,
    sortKeys: true,
    lineWidth: -1,
  });
}

export function inferCourseProjectDirectory(
  courseYaml: string,
  fallback = "course-variant"
): string {
  try {
    const parsed = yaml.load(courseYaml);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      return safeSlug(parsed.id);
    }
  } catch {
    return safeSlug(fallback);
  }

  return safeSlug(fallback);
}

export function createDuplicatedTemplateDraft(input: {
  courseYaml: string;
  templateData: Record<string, TemplateScalarValue>;
  templateTitle: string;
  fallbackDirectory: string;
}): DuplicatedTemplateDraft {
  const baseDirectory = inferCourseProjectDirectory(
    input.courseYaml,
    input.fallbackDirectory
  );

  return {
    courseYaml: input.courseYaml,
    templateData: {
      ...input.templateData,
    },
    sourceLabel: `Local duplicate: ${input.templateTitle}`,
    suggestedProjectDirectory: `${baseDirectory}-variant`,
  };
}

export function createDuplicatedVariantDraft(input: {
  variantId: string;
  variantTitle: string;
  values: Record<string, TemplateScalarValue>;
}): DuplicatedVariantDraft {
  const safeVariantId = safeSlug(input.variantId || input.variantTitle);

  return {
    title: `${input.variantTitle} copy`,
    variantId: `${safeVariantId}-copy`,
    values: {
      ...input.values,
    },
    sourceLabel: `Local variant: ${input.variantTitle} copy`,
    suggestedFileName: `${safeVariantId}-copy.yaml`,
  };
}

export function buildSourceDownloadFileName(
  projectDirectory: string,
  kind: "course" | "template-data"
): string {
  const baseName = safeSlug(projectDirectory);
  return `${baseName}-${kind}.yaml`;
}

export function buildCourseProjectReadme(input: {
  title: string;
  templateName: string;
  projectDirectory: string;
}): string {
  return [
    `# ${input.title}`,
    "",
    `This course variant is based on \`${input.templateName}\`.`,
    "",
    "Recommended source layout:",
    "",
    `- \`courses/${input.projectDirectory}/course.yaml\`: branching course structure with placeholders`,
    `- \`courses/${input.projectDirectory}/template-data.yaml\`: course-specific variable values or exported variant data`,
    "- For template-pack workflows, keep shared templates in `/templates` and variable sets in `/template-packs/<pack>/variants/*.yaml`.",
    "- Keep reusable branded presentation in `/themes/<theme-pack>/` so source structure and theme packs can evolve independently in Git.",
    "- Commit these source files to Git. Treat exported SCORM packages as build artifacts.",
  ].join("\n");
}
