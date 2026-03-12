import type { CompiledChoiceNode, CompiledCourse, CompiledQuizNode } from "@/lib/course/types";

export interface ScormPreflightCheck {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

export interface ScormPreflightResult {
  ready: boolean;
  checks: ScormPreflightCheck[];
}

function checkReferences(course: CompiledCourse): ScormPreflightCheck {
  const issues: string[] = [];

  course.nodeOrder.forEach((nodeId) => {
    const node = course.nodes[nodeId];

    if (!node) {
      issues.push(`Missing compiled node "${nodeId}".`);
      return;
    }

    if (node.type === "content" && node.next && !course.nodes[node.next]) {
      issues.push(`Content node "${node.id}" points to missing next node "${node.next}".`);
    }

    if (node.type === "choice") {
      (node as CompiledChoiceNode).options.forEach((option) => {
        if (!course.nodes[option.next]) {
          issues.push(
            `Choice node "${node.id}" points to missing option target "${option.next}".`
          );
        }
      });
    }

    if (node.type === "quiz") {
      const quizNode = node as CompiledQuizNode;

      if (quizNode.next && !course.nodes[quizNode.next]) {
        issues.push(`Quiz node "${node.id}" points to missing next node "${quizNode.next}".`);
      }

      if (quizNode.passNext && !course.nodes[quizNode.passNext]) {
        issues.push(
          `Quiz node "${node.id}" points to missing passNext node "${quizNode.passNext}".`
        );
      }

      if (quizNode.failNext && !course.nodes[quizNode.failNext]) {
        issues.push(
          `Quiz node "${node.id}" points to missing failNext node "${quizNode.failNext}".`
        );
      }
    }
  });

  return {
    id: "references",
    label: "References resolved",
    passed: issues.length === 0,
    details:
      issues.length === 0
        ? "Compiled node references and branching targets resolve successfully."
        : issues.join(" "),
  };
}

function checkLessonStatusBehavior(course: CompiledCourse): ScormPreflightCheck {
  const resultNodes = course.nodeOrder
    .map((nodeId) => course.nodes[nodeId])
    .filter((node) => node?.type === "result");

  const hasExplicitStatuses = resultNodes.length > 0;

  return {
    id: "lesson-status",
    label: "Lesson status behavior configured",
    passed: hasExplicitStatuses,
    details: hasExplicitStatuses
      ? "Result nodes are present, so SCORM lesson status can be mapped explicitly."
      : "Add at least one result node so SCORM lesson status can end as completed, passed, or failed.",
  };
}

function checkScoreBehavior(course: CompiledCourse): ScormPreflightCheck {
  const quizCount = course.nodeOrder.filter(
    (nodeId) => course.nodes[nodeId]?.type === "quiz"
  ).length;
  const scoredChoices = course.nodeOrder.some((nodeId) => {
    const node = course.nodes[nodeId];
    return (
      node?.type === "choice" &&
      (node as CompiledChoiceNode).options.some((option) => option.score !== 0)
    );
  });
  const requiresScore = quizCount > 0 || scoredChoices;
  const scoreConfigured =
    !requiresScore ||
    (course.maxScore > 0 &&
      course.passingScore >= 0 &&
      course.passingScore <= course.maxScore);

  return {
    id: "score-behavior",
    label: "Score behavior configured",
    passed: scoreConfigured,
    details: scoreConfigured
      ? requiresScore
        ? `Scoring is configured with max score ${course.maxScore} and passing score ${course.passingScore}.`
        : "No scored quiz or choice nodes are present, so score reporting is optional."
      : "Quiz or scored choice nodes exist, but the course passing score or max score is not configured for SCORM reporting.",
  };
}

export function runScormExportPreflight(input: {
  course: CompiledCourse;
  manifest: string;
  packageContents: readonly string[];
  launchPath?: string;
  exportMode: "standard" | "validation";
}): ScormPreflightResult {
  const launchPath = input.launchPath ?? "index.html";
  const manifestCheck: ScormPreflightCheck = {
    id: "manifest",
    label: "Required manifest fields present",
    passed:
      input.manifest.includes("<manifest") &&
      input.manifest.includes("<organization") &&
      input.manifest.includes(`href="${launchPath}"`) &&
      input.manifest.includes("<schema>ADL SCORM</schema>"),
    details:
      "Manifest includes the SCORM 1.2 root element, organization, schema metadata, and launch reference.",
  };

  const launchFileCheck: ScormPreflightCheck = {
    id: "launch-file",
    label: "Launch file exists",
    passed: input.packageContents.includes(launchPath),
    details: `Expected launch path: ${launchPath}.`,
  };

  const courseJsonCheck: ScormPreflightCheck = {
    id: "course-json",
    label: "course.json exists",
    passed: input.packageContents.includes("assets/course.json"),
    details: "The compiled runtime graph must be packaged as assets/course.json.",
  };

  const themeStylesCheck: ScormPreflightCheck = {
    id: "theme-css",
    label: "Theme stylesheet exists",
    passed: input.packageContents.includes("assets/theme.css"),
    details:
      "Brand tokens should be packaged as assets/theme.css so preview and SCORM build styling stay aligned.",
  };

  const themeAssetCheck: ScormPreflightCheck = {
    id: "theme-assets",
    label: "Theme assets resolved",
    passed:
      !input.course.theme.logo ||
      !input.course.theme.logo.startsWith("assets/") ||
      input.packageContents.includes(input.course.theme.logo),
    details:
      input.course.theme.logo && input.course.theme.logo.startsWith("assets/")
        ? `Expected bundled theme asset: ${input.course.theme.logo}.`
        : "Theme does not require bundled logo assets for this build.",
  };

  const diagnosticsCheck: ScormPreflightCheck = {
    id: "diagnostics-mode",
    label: "Diagnostics mode matches export selection",
    passed:
      input.exportMode === "validation"
        ? input.packageContents.includes("validation-notes.txt")
        : !input.packageContents.includes("validation-notes.txt"),
    details:
      input.exportMode === "validation"
        ? "Validation build includes validation notes and diagnostics-enabled runtime output."
        : "Standard export omits validation-only package notes and keeps diagnostics disabled by default.",
  };

  const checks = [
    manifestCheck,
    launchFileCheck,
    courseJsonCheck,
    themeStylesCheck,
    themeAssetCheck,
    checkReferences(input.course),
    checkLessonStatusBehavior(input.course),
    checkScoreBehavior(input.course),
    diagnosticsCheck,
  ];

  return {
    ready: checks.every((check) => check.passed),
    checks,
  };
}
