import yaml from "js-yaml";
import { ZodError } from "zod";

import { compileCourse, CourseCompilationError } from "@/lib/course/compile";
import {
  CourseTemplateResolutionError,
  CourseValidationError,
} from "@/lib/course/errors";
import {
  courseTemplateDocumentSchema,
  type CourseTemplateDocument,
  type TemplateScalarValue,
} from "@/lib/course/schema";
import {
  resolveCourseTemplate,
  type ResolvedCourseTemplate,
  type ResolveCourseTemplateOptions,
  type TemplateFieldDefinition,
} from "@/lib/course/template";
import type { CompiledCourse } from "@/lib/course/types";

export interface ParsedCourseBundle {
  course: CompiledCourse;
  resolvedTemplate: ResolvedCourseTemplate;
}

function formatPath(path: PropertyKey[]): string {
  return path.length === 0
    ? "course"
    : path.map((segment) => String(segment)).join(".");
}

function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`);
}

function isTemplateScalarValue(value: unknown): value is TemplateScalarValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function collectCourseErrorMessages(error: unknown): string[] {
  if (
    error instanceof CourseValidationError ||
    error instanceof CourseCompilationError ||
    error instanceof CourseTemplateResolutionError
  ) {
    return error.issues;
  }

  if (error instanceof ZodError) {
    return formatZodIssues(error);
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ["Unknown course error."];
}

export function parseCourseTemplateYaml(source: string): CourseTemplateDocument {
  try {
    const parsedDocument = yaml.load(source);
    return courseTemplateDocumentSchema.parse(parsedDocument);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CourseValidationError(formatZodIssues(error));
    }

    if (error instanceof Error) {
      throw new CourseValidationError([error.message]);
    }

    throw error;
  }
}

export function inspectTemplateFields(source: string): TemplateFieldDefinition[] | null {
  try {
    const parsedDocument = yaml.load(source);

    if (
      !parsedDocument ||
      typeof parsedDocument !== "object" ||
      Array.isArray(parsedDocument)
    ) {
      return [];
    }

    const templateData = (parsedDocument as Record<string, unknown>).templateData;

    if (!templateData || typeof templateData !== "object" || Array.isArray(templateData)) {
      return [];
    }

    return Object.entries(templateData).flatMap(([key, value]) =>
      isTemplateScalarValue(value)
        ? [
            {
              key,
              value,
              inputType:
                typeof value === "number"
                  ? "number"
                  : typeof value === "boolean"
                    ? "boolean"
                    : "text",
            } satisfies TemplateFieldDefinition,
          ]
        : []
    );
  } catch {
    return null;
  }
}

export function inspectTemplateFieldsWithOverrides(
  source: string,
  overrides: Record<string, TemplateScalarValue>
): TemplateFieldDefinition[] | null {
  try {
    const templateDocument = parseCourseTemplateYaml(source);
    const resolvedTemplate = resolveCourseTemplate(templateDocument, {
      templateDataOverrides: overrides,
    });

    return resolvedTemplate.templateFields;
  } catch {
    return null;
  }
}

export function parseAndCompileCourseBundle(
  source: string,
  options: ResolveCourseTemplateOptions = {}
): ParsedCourseBundle {
  const templateDocument = parseCourseTemplateYaml(source);
  const resolvedTemplate = resolveCourseTemplate(templateDocument, options);

  return {
    course: compileCourse(resolvedTemplate.document),
    resolvedTemplate,
  };
}

export function parseAndCompileCourse(
  source: string,
  options: ResolveCourseTemplateOptions = {}
): CompiledCourse {
  return parseAndCompileCourseBundle(source, options).course;
}
