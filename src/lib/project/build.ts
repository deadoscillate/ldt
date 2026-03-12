import {
  runCoursePipeline,
  type CoursePipelineSnapshot,
} from "@/lib/course/pipeline";
import type {
  TemplatePackTemplate,
  TemplatePackVariant,
} from "@/lib/course/template-pack";
import {
  exportCourseAsScormZip,
  type ScormBuildContext,
  type ScormExportBundle,
  type ScormExportOptions,
} from "@/lib/export/scorm-export";
import {
  exportCourseFamilyBuildBundle,
  type CourseFamilyBuildBundle,
} from "@/lib/export/template-family-export";
import type { CourseProject } from "@/lib/project/schema";
import type { ThemePack } from "@/lib/theme/schema";

export interface CourseProjectBuildSelection {
  templateId: string;
  variantId: string;
  themeId: string;
}

export interface ResolvedCourseProjectBuildSelection {
  project: CourseProject;
  template: TemplatePackTemplate;
  variant: TemplatePackVariant;
  theme: ThemePack;
  snapshot: CoursePipelineSnapshot;
  buildContext: ScormBuildContext;
}

export function listCourseProjectBuildSelections(
  project: CourseProject
): CourseProjectBuildSelection[] {
  return project.templates.flatMap((template) =>
    template.variants.flatMap((variant) =>
      project.themes.map((theme) => ({
        templateId: template.id,
        variantId: variant.id,
        themeId: theme.id,
      }))
    )
  );
}

export function buildCourseProjectBuildContext(input: {
  project: CourseProject;
  template: TemplatePackTemplate;
  variant: TemplatePackVariant;
  theme: ThemePack;
}): ScormBuildContext {
  return {
    projectId: input.project.id,
    projectTitle: input.project.title,
    projectVersion: input.project.version,
    templateId: input.template.id,
    templateTitle: input.template.title,
    variantId: input.variant.id,
    variantTitle: input.variant.title,
    themeId: input.theme.id,
    themeName: input.theme.name,
    sourceFiles: input.project.sourceFiles.map((file) => file.path),
  };
}

export function resolveCourseProjectBuildSelection(
  project: CourseProject,
  selection: CourseProjectBuildSelection
): ResolvedCourseProjectBuildSelection {
  const template =
    project.templates.find((candidate) => candidate.id === selection.templateId) ?? null;

  if (!template) {
    throw new Error(
      `Project "${project.id}" does not define template "${selection.templateId}".`
    );
  }

  const variant =
    template.variants.find((candidate) => candidate.id === selection.variantId) ?? null;

  if (!variant) {
    throw new Error(
      `Template "${template.id}" does not define variant "${selection.variantId}".`
    );
  }

  const theme =
    project.themes.find((candidate) => candidate.id === selection.themeId) ?? null;

  if (!theme) {
    throw new Error(
      `Project "${project.id}" does not define theme "${selection.themeId}".`
    );
  }

  const snapshot = runCoursePipeline(template.yaml, {
    templateDataOverrides: variant.values,
    variableSchema: template.variableSchema,
  });

  if (!snapshot.exportModel) {
    throw new Error(
      `Project build "${template.id}/${variant.id}/${theme.id}" failed validation. ${snapshot.errors[0] ?? ""}`.trim()
    );
  }

  return {
    project,
    template,
    variant,
    theme,
    snapshot,
    buildContext: buildCourseProjectBuildContext({
      project,
      template,
      variant,
      theme,
    }),
  };
}

export async function exportCourseProjectBuild(
  project: CourseProject,
  selection: CourseProjectBuildSelection,
  options: Omit<ScormExportOptions, "themePack" | "buildContext"> = {}
): Promise<ScormExportBundle> {
  const resolvedSelection = resolveCourseProjectBuildSelection(project, selection);

  return exportCourseAsScormZip(resolvedSelection.snapshot.exportModel!, {
    ...options,
    themePack: resolvedSelection.theme,
    buildContext: resolvedSelection.buildContext,
  });
}

export async function exportCourseProjectBuildMatrix(
  project: CourseProject,
  options: Omit<ScormExportOptions, "themePack" | "buildContext"> & {
    selections?: readonly CourseProjectBuildSelection[];
  } = {}
): Promise<CourseFamilyBuildBundle> {
  const selections = options.selections ?? listCourseProjectBuildSelections(project);
  const builds = selections.map((selection) => {
    const resolvedSelection = resolveCourseProjectBuildSelection(project, selection);

    return {
      projectId: project.id,
      projectTitle: project.title,
      projectVersion: project.version,
      packId: project.id,
      packTitle: project.title,
      templateId: resolvedSelection.template.id,
      templateTitle: resolvedSelection.template.title,
      variantId: resolvedSelection.variant.id,
      variantTitle: resolvedSelection.variant.title,
      course: resolvedSelection.snapshot.exportModel!,
      themePack: resolvedSelection.theme,
      buildContext: resolvedSelection.buildContext,
    };
  });

  return exportCourseFamilyBuildBundle(builds, options);
}
