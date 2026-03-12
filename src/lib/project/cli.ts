import type { ScormExportMode } from "@/lib/export/scorm-export";
import type { CourseProjectBuildCommand } from "@/lib/project/automation";

export interface ParsedCourseProjectCliArgs {
  command: CourseProjectBuildCommand;
  projectPath: string;
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
}

const VALID_COMMANDS: readonly CourseProjectBuildCommand[] = [
  "validate",
  "compile",
  "export",
  "export-all",
  "manifest",
  "clean",
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
    "Usage:",
    "  tsx scripts/course-project-build.ts <command> --project <path> [options]",
    "",
    "Commands:",
    "  validate     Validate project structure and source compilation",
    "  compile      Generate the runtime-ready preview model",
    "  export       Generate one SCORM build",
    "  export-all   Generate all valid variant/theme SCORM builds",
    "  manifest     Generate build manifest data without writing a SCORM zip",
    "  clean        Remove generated build outputs",
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
    "  --all                  Validate or build all targets",
    "  --fail-on-warning      Exit non-zero when warnings are present",
  ].join("\n");
}

export function parseCourseProjectCliArgs(
  argv: readonly string[]
): ParsedCourseProjectCliArgs {
  const [rawCommand, ...args] = argv;

  if (!rawCommand || !VALID_COMMANDS.includes(rawCommand as CourseProjectBuildCommand)) {
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
      case "--all":
        all = true;
        break;
      case "--fail-on-warning":
        failOnWarning = true;
        break;
      default:
        throw new Error(`Unknown argument "${arg}".`);
    }
  }

  if (!projectPath) {
    throw new Error("Missing required --project <path> argument.");
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

  return {
    command: rawCommand as CourseProjectBuildCommand,
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
  };
}
