import type { ScormExportMode } from "@/lib/export/scorm-export";
import { BRAND } from "@/lib/app/brand";
import type { CourseProjectBuildCommand } from "@/lib/project/automation";

export type CourseProjectCliCommand = CourseProjectBuildCommand | "affected" | "test";

export interface ParsedCourseProjectCliArgs {
  command: CourseProjectCliCommand;
  projectPath: string | null;
  outputPath: string | null;
  jsonReportPath: string | null;
  exportMode: ScormExportMode;
  failOnWarning: boolean;
  selection: {
    templateId?: string;
    variantId?: string;
    themeId?: string;
  } | null;
  all: boolean;
  allProjects: boolean;
  runTests: boolean;
  changedInputs: string[];
  moduleIds: string[];
}

const VALID_COMMANDS: readonly CourseProjectCliCommand[] = [
  "validate",
  "compile",
  "export",
  "export-all",
  "manifest",
  "clean",
  "affected",
  "test",
] as const;

function parseTargetSelection(value: string): {
  templateId: string;
  variantId: string;
  themeId: string;
} {
  const parts = value.split("/").map((part) => part.trim()).filter(Boolean);

  if (parts.length !== 3) {
    throw new Error(
      `Invalid target "${value}". Expected "<template>/<variant>/<theme>".`
    );
  }

  const [templateId, variantId, themeId] = parts;

  return {
    templateId,
    variantId,
    themeId,
  };
}

function readOptionValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

export function buildCourseProjectCliUsage(): string {
  return [
    `${BRAND.buildName}`,
    "",
    "Usage:",
    "  tsx scripts/course-project-build.ts <command> [options]",
    "",
    "Commands:",
    "  validate     Validate project structure and source compilation",
    "  compile      Generate the runtime-ready preview model",
    "  export       Generate one SCORM build",
    "  export-all   Generate all valid variant/theme SCORM builds",
    "  manifest     Generate build manifest data without writing a SCORM zip",
    "  clean        Remove generated build outputs",
    "  affected     Rebuild only targets affected by changed shared modules or source files",
    "  test         Run declarative learner-path logic tests for a course project",
    "",
    "Options:",
    "  --project <path>       Project directory to load",
    "  --output <path>        Override the build output directory",
    "  --json-report <path>   Write an extra JSON report copy to this path",
    "  --mode <mode>          standard | validation",
    "  --target <selection>   Shorthand: <template>/<variant>/<theme>",
    "  --template <id>        Template id for a single-target build",
    "  --variant <id>         Variant id for a single-target build",
    "  --theme <id>           Theme id for a single-target build",
    "  --module <id>          Shared module id for affected rebuild detection",
    "  --changed <path>       Changed source path for affected rebuild detection",
    "  --changed-source <path> Alias for --changed",
    "  --run-tests            When rebuilding affected targets, also run logic tests for the impacted targets",
    "  --all                  Validate or build all targets",
    "  --all-projects         Run the command across all local course projects (supported for test)",
    "  --fail-on-warning      Exit non-zero when warnings are present",
  ].join("\n");
}

export function parseCourseProjectCliArgs(
  argv: readonly string[]
): ParsedCourseProjectCliArgs {
  const [rawCommand, ...args] = argv;

  if (!rawCommand || !VALID_COMMANDS.includes(rawCommand as CourseProjectCliCommand)) {
    throw new Error(
      `Unknown or missing command. Expected one of: ${VALID_COMMANDS.join(", ")}.`
    );
  }

  let projectPath: string | null = null;
  let outputPath: string | null = null;
  let jsonReportPath: string | null = null;
  let exportMode: ScormExportMode = "standard";
  let failOnWarning = false;
  let all = false;
  let allProjects = false;
  let runTests = false;
  const changedInputs: string[] = [];
  const moduleIds: string[] = [];
  let targetSelection:
    | {
        templateId: string;
        variantId: string;
        themeId: string;
      }
    | null = null;
  let templateId: string | undefined;
  let variantId: string | undefined;
  let themeId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--project":
        projectPath = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--output":
        outputPath = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--json-report":
        jsonReportPath = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--mode": {
        const mode = readOptionValue(args, index, arg);

        if (mode !== "standard" && mode !== "validation") {
          throw new Error(`Invalid export mode "${mode}". Expected "standard" or "validation".`);
        }

        exportMode = mode;
        index += 1;
        break;
      }
      case "--target":
        targetSelection = parseTargetSelection(readOptionValue(args, index, arg));
        index += 1;
        break;
      case "--template":
        templateId = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--variant":
        variantId = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--theme":
        themeId = readOptionValue(args, index, arg);
        index += 1;
        break;
      case "--module":
        moduleIds.push(readOptionValue(args, index, arg));
        index += 1;
        break;
      case "--changed":
      case "--changed-source":
        changedInputs.push(readOptionValue(args, index, arg));
        index += 1;
        break;
      case "--all":
        all = true;
        break;
      case "--all-projects":
        allProjects = true;
        break;
      case "--run-tests":
        runTests = true;
        break;
      case "--fail-on-warning":
        failOnWarning = true;
        break;
      default:
        throw new Error(`Unknown argument "${arg}".`);
    }
  }

  if (targetSelection) {
    if (templateId && templateId !== targetSelection.templateId) {
      throw new Error(
        'Conflicting target selection. "--target" and "--template" disagree.'
      );
    }

    if (variantId && variantId !== targetSelection.variantId) {
      throw new Error(
        'Conflicting target selection. "--target" and "--variant" disagree.'
      );
    }

    if (themeId && themeId !== targetSelection.themeId) {
      throw new Error(
        'Conflicting target selection. "--target" and "--theme" disagree.'
      );
    }

    templateId = targetSelection.templateId;
    variantId = targetSelection.variantId;
    themeId = targetSelection.themeId;
  }

  if (rawCommand !== "affected" && rawCommand !== "test" && !projectPath) {
    throw new Error("Missing required --project <path> argument.");
  }

  if (rawCommand === "test" && !projectPath && !allProjects) {
    throw new Error(
      'Logic test runs require "--project <path>" or "--all-projects".'
    );
  }

  if (rawCommand !== "affected" && runTests) {
    throw new Error('"--run-tests" is only valid with the "affected" command.');
  }

  if (rawCommand !== "test" && allProjects) {
    throw new Error('"--all-projects" is only valid with the "test" command.');
  }

  if (rawCommand === "affected" && moduleIds.length === 0 && changedInputs.length === 0) {
    throw new Error(
      'Affected rebuilds require at least one "--module <id>" or "--changed <path>" value.'
    );
  }

  return {
    command: rawCommand as CourseProjectCliCommand,
    projectPath,
    outputPath,
    jsonReportPath,
    exportMode,
    failOnWarning,
    selection:
      templateId || variantId || themeId
        ? {
            templateId,
            variantId,
            themeId,
          }
        : null,
    all,
    allProjects,
    runTests,
    changedInputs,
    moduleIds,
  };
}
