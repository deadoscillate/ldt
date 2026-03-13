import type { TemplateScalarValue } from "@/lib/course/schema";
import type { CompiledChoiceNode, CompiledCourse } from "@/lib/course/types";
import {
  advanceContentNode,
  applyChoiceSelection,
  getCurrentNode,
  initializeRuntime,
  resolveNodeInteraction,
  submitQuizAnswer,
} from "@/lib/runtime/engine";
import type { RuntimeState } from "@/lib/runtime/types";
import type {
  CourseLogicTestAction,
  CourseLogicTestCase,
  CourseLogicTestCompletionStatus,
  CourseLogicTestExpectations,
  CourseLogicTestSuccessStatus,
  CourseLogicTestSuite,
  CourseLogicTestTarget,
} from "@/lib/course-tests/schema";
import {
  listCourseProjectBuildSelections,
  resolveCourseProjectBuildSelection,
  type CourseProjectBuildSelection,
} from "@/lib/project/build";
import type { CourseProject } from "@/lib/project/schema";
import type { SharedModuleLibrary } from "@/lib/module-library/schema";

export interface CourseLogicTestIssue {
  severity: "warning" | "error";
  code: string;
  message: string;
  suiteId?: string | null;
  testId?: string | null;
  targetKey?: string | null;
}

export interface CourseLogicTestActionTrace {
  step: string;
  action: "advance" | "select" | "interact";
  value: string | readonly string[] | true;
  nextStep: string | null;
}

export interface CourseLogicTestActualOutcome {
  terminalStep: string;
  score: number;
  completionStatus: CourseLogicTestCompletionStatus;
  successStatus: CourseLogicTestSuccessStatus;
  pathLength: number;
  variables: Record<string, TemplateScalarValue>;
  state: Record<string, TemplateScalarValue>;
  pathTaken: readonly string[];
}

export interface CourseLogicTestResult {
  suiteId: string;
  suiteTitle: string;
  suiteSourcePath: string;
  testId: string;
  name: string;
  description: string;
  tags: readonly string[];
  targetKey: string;
  selection: CourseProjectBuildSelection;
  courseId: string;
  courseTitle: string;
  success: boolean;
  warnings: readonly CourseLogicTestIssue[];
  errors: readonly CourseLogicTestIssue[];
  expected: CourseLogicTestExpectations;
  actual: CourseLogicTestActualOutcome;
  actionTrace: readonly CourseLogicTestActionTrace[];
  runtimeWarnings: readonly string[];
}

export interface CourseLogicTestCoverageSummary {
  targetKey: string;
  courseId: string;
  courseTitle: string;
  visitedSteps: readonly string[];
  interactiveSteps: readonly string[];
  untestedInteractiveSteps: readonly string[];
}

export interface CourseProjectLogicTestReport {
  command: "test";
  projectId: string;
  projectTitle: string;
  projectVersion: string;
  generatedAt: string;
  success: boolean;
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningCount: number;
  errorCount: number;
  outputPaths: readonly string[];
  warnings: readonly CourseLogicTestIssue[];
  errors: readonly CourseLogicTestIssue[];
  results: readonly CourseLogicTestResult[];
  coverage: readonly CourseLogicTestCoverageSummary[];
}

export interface CourseProjectLogicTestArtifact {
  path: string;
  kind: "logic-test-report" | "logic-test-summary";
  contents: string;
}

export interface CourseProjectLogicTestRun {
  report: CourseProjectLogicTestReport;
  artifacts: readonly CourseProjectLogicTestArtifact[];
  summaryMarkdown: string;
}

export interface CourseProjectLogicTestRunOptions {
  selection?: Partial<CourseProjectBuildSelection> | null;
  selections?: readonly CourseProjectBuildSelection[];
  generatedAt?: string;
  moduleLibrary?: SharedModuleLibrary | null;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function buildTargetKey(selection: CourseProjectBuildSelection): string {
  return [selection.templateId, selection.variantId, selection.themeId].join("/");
}

function buildTestsDirectory(project: CourseProject): string {
  return normalizePath(`${project.buildDirectory}/tests`);
}

function buildLogicTestReportPath(project: CourseProject): string {
  return `${buildTestsDirectory(project)}/course-test-report.json`;
}

function buildLogicTestSummaryPath(project: CourseProject): string {
  return `${buildTestsDirectory(project)}/course-test-summary.md`;
}

function matchesSelection(
  selection: CourseProjectBuildSelection,
  filter: Partial<CourseProjectBuildSelection>
): boolean {
  return (
    (filter.templateId === undefined || selection.templateId === filter.templateId) &&
    (filter.variantId === undefined || selection.variantId === filter.variantId) &&
    (filter.themeId === undefined || selection.themeId === filter.themeId)
  );
}

function mergeTargets(
  project: CourseProject,
  suiteTarget: CourseLogicTestTarget | null,
  testTarget: CourseLogicTestTarget | null
): CourseProjectBuildSelection {
  return {
    templateId:
      testTarget?.templateId ??
      suiteTarget?.templateId ??
      project.defaultTemplateId,
    variantId:
      testTarget?.variantId ??
      suiteTarget?.variantId ??
      project.defaultVariantId,
    themeId:
      testTarget?.themeId ??
      suiteTarget?.themeId ??
      project.defaultThemeId,
  };
}

function deriveCompletionStatus(state: RuntimeState): CourseLogicTestCompletionStatus {
  return state.completed ? "completed" : "incomplete";
}

function deriveSuccessStatus(
  course: CompiledCourse,
  state: RuntimeState
): CourseLogicTestSuccessStatus {
  const currentNode = course.nodes[state.currentNodeId];

  if (!currentNode || currentNode.type !== "result") {
    return "none";
  }

  return currentNode.outcome;
}

function buildRuntimeVariableMap(input: {
  course: CompiledCourse;
  state: RuntimeState;
  templateData: Record<string, TemplateScalarValue>;
}): Record<string, TemplateScalarValue> {
  const percent =
    input.course.maxScore > 0
      ? Math.round((input.state.score / input.course.maxScore) * 100)
      : 0;

  return {
    ...input.templateData,
    courseTitle: input.course.title,
    score: input.state.score,
    maxScore: input.course.maxScore,
    passingScore: input.course.passingScore,
    percent,
    ...input.state.scenarioState,
  };
}

function validateStepAction(
  course: CompiledCourse,
  action: CourseLogicTestAction
): CourseLogicTestIssue[] {
  const node = course.nodes[action.step];

  if (!node) {
    return [
      {
        severity: "error",
        code: "missing-step",
        message: `Test action references step "${action.step}" but that step does not exist in the compiled course.`,
      },
    ];
  }

  if ("advance" in action) {
    if (node.type !== "content") {
      return [
        {
          severity: "error",
          code: "invalid-advance-action",
          message: `Step "${action.step}" is ${node.sourceType}, so it cannot use an advance action.`,
        },
      ];
    }

    return [];
  }

  if ("interact" in action) {
    const interactionIds = Array.isArray(action.interact)
      ? action.interact
      : [action.interact];

    if (node.type !== "choice" && node.type !== "quiz") {
      return [
        {
          severity: "error",
          code: "invalid-interact-action",
          message: `Step "${action.step}" is ${node.sourceType}, so it cannot use shell interaction actions.`,
        },
      ];
    }

    if (node.type === "choice" && interactionIds.length !== 1) {
      return [
        {
          severity: "error",
          code: "invalid-choice-interaction",
          message: `Step "${action.step}" requires exactly one interaction id.`,
        },
      ];
    }

    if (node.type === "quiz" && !node.multiple && interactionIds.length !== 1) {
      return [
        {
          severity: "error",
          code: "invalid-quiz-interaction",
          message: `Step "${action.step}" only accepts one interaction because it is a single-answer question.`,
        },
      ];
    }

    const availableIds = new Set(node.interactions.map((interaction) => interaction.id));
    const missingIds = interactionIds.filter((interactionId) => !availableIds.has(interactionId));

    if (missingIds.length > 0) {
      return [
        {
          severity: "error",
          code: "missing-interaction",
          message: `Step "${action.step}" does not define interaction id${missingIds.length === 1 ? "" : "s"} ${missingIds
            .map((interactionId) => `"${interactionId}"`)
            .join(", ")}.`,
        },
      ];
    }

    return [];
  }

  const selectedOptionIds = Array.isArray(action.select)
    ? action.select
    : [action.select];

  if (node.type !== "choice" && node.type !== "quiz") {
    return [
      {
        severity: "error",
        code: "invalid-select-action",
        message: `Step "${action.step}" is ${node.sourceType}, so it cannot use a select action.`,
      },
    ];
  }

  if (node.type === "choice" && selectedOptionIds.length !== 1) {
    return [
      {
        severity: "error",
        code: "invalid-choice-selection",
        message: `Step "${action.step}" requires exactly one option id.`,
      },
    ];
  }

  if (node.type === "quiz" && !node.multiple && selectedOptionIds.length !== 1) {
    return [
      {
        severity: "error",
        code: "invalid-quiz-selection",
        message: `Step "${action.step}" only accepts one option because it is a single-answer question.`,
      },
    ];
  }

  const optionIds =
    node.type === "choice"
      ? new Set((node as CompiledChoiceNode).options.map((option) => option.id))
      : new Set(node.options.map((option) => option.id));
  const missingOptionIds = selectedOptionIds.filter((optionId) => !optionIds.has(optionId));

  if (missingOptionIds.length > 0) {
    return [
      {
        severity: "error",
        code: "missing-option",
        message: `Step "${action.step}" does not define option id${missingOptionIds.length === 1 ? "" : "s"} ${missingOptionIds
          .map((optionId) => `"${optionId}"`)
          .join(", ")}.`,
      },
    ];
  }

  return [];
}

function validateTestCase(
  course: CompiledCourse,
  testCase: CourseLogicTestCase
): CourseLogicTestIssue[] {
  const issues: CourseLogicTestIssue[] = [];

  testCase.actions.forEach((action) => {
    issues.push(...validateStepAction(course, action));
  });

  if (testCase.initialState?.currentNodeId && !course.nodes[testCase.initialState.currentNodeId]) {
    issues.push({
      severity: "error",
      code: "invalid-initial-node",
      message: `Initial state references step "${testCase.initialState.currentNodeId}" but that step does not exist in the compiled course.`,
    });
  }

  Object.keys(testCase.initialState?.state ?? {}).forEach((key) => {
    if (!course.scenarioState[key]) {
      issues.push({
        severity: "error",
        code: "invalid-initial-state-key",
        message: `Initial state references scenario variable "${key}" but that variable is not defined in the compiled course.`,
      });
    }
  });

  if (
    testCase.expect.terminalStep &&
    !course.nodes[testCase.expect.terminalStep]
  ) {
    issues.push({
      severity: "error",
      code: "invalid-terminal-step",
      message: `Expected terminal step "${testCase.expect.terminalStep}" does not exist in the compiled course.`,
    });
  }

  Object.keys(testCase.expect.state ?? {}).forEach((key) => {
    if (!course.scenarioState[key]) {
      issues.push({
        severity: "error",
        code: "invalid-expected-state-key",
        message: `Expected state references scenario variable "${key}" but that variable is not defined in the compiled course.`,
      });
    }
  });

  return issues;
}

function simulateAction(
  course: CompiledCourse,
  state: RuntimeState,
  action: CourseLogicTestAction
): { state: RuntimeState; trace: CourseLogicTestActionTrace } {
  const currentNode = getCurrentNode(course, state);

  if (currentNode.id !== action.step) {
    throw new Error(
      `Expected to act on step "${action.step}", but the learner is currently at "${currentNode.id}".`
    );
  }

  if ("advance" in action) {
    if (currentNode.type !== "content") {
      throw new Error(
        `Step "${currentNode.id}" is ${currentNode.sourceType} and cannot use an advance action.`
      );
    }

    const nextState = advanceContentNode(course, state);

    return {
      state: nextState,
      trace: {
        step: action.step,
        action: "advance",
        value: true,
        nextStep: nextState.currentNodeId,
      },
    };
  }

  if ("interact" in action) {
    const interactionIds = Array.isArray(action.interact)
      ? action.interact
      : [action.interact];

    if (currentNode.type === "choice") {
      if (interactionIds.length !== 1) {
        throw new Error(
          `Step "${currentNode.id}" requires exactly one interaction.`
        );
      }

      const resolved = resolveNodeInteraction(currentNode, interactionIds[0]!);

      if (!resolved) {
        throw new Error(
          `Step "${currentNode.id}" does not define interaction "${interactionIds[0]}".`
        );
      }

      const nextState = applyChoiceSelection(
        course,
        state,
        resolved.optionId,
        interactionIds[0]!
      );

      return {
        state: nextState,
        trace: {
          step: action.step,
          action: "interact",
          value: interactionIds[0]!,
          nextStep: nextState.currentNodeId,
        },
      };
    }

    if (currentNode.type !== "quiz") {
      throw new Error(
        `Step "${currentNode.id}" is ${currentNode.sourceType} and does not accept shell interactions.`
      );
    }

    const selectedOptionIds = interactionIds.map((interactionId) => {
      const resolved = resolveNodeInteraction(currentNode, interactionId);

      if (!resolved) {
        throw new Error(
          `Step "${currentNode.id}" does not define interaction "${interactionId}".`
        );
      }

      return resolved.optionId;
    });
    const nextState = submitQuizAnswer(course, state, selectedOptionIds, interactionIds);

    return {
      state: nextState,
      trace: {
        step: action.step,
        action: "interact",
        value: [...interactionIds],
        nextStep: nextState.currentNodeId,
      },
    };
  }

  const selectedOptionIds = Array.isArray(action.select)
    ? action.select
    : [action.select];

  if (currentNode.type === "choice") {
    if (selectedOptionIds.length !== 1) {
      throw new Error(
        `Step "${currentNode.id}" requires exactly one selected option.`
      );
    }

    const nextState = applyChoiceSelection(course, state, selectedOptionIds[0]!);

    return {
      state: nextState,
      trace: {
        step: action.step,
        action: "select",
        value: selectedOptionIds[0]!,
        nextStep: nextState.currentNodeId,
      },
    };
  }

  if (currentNode.type !== "quiz") {
    throw new Error(
      `Step "${currentNode.id}" is ${currentNode.sourceType} and does not accept selection actions.`
    );
  }

  const nextState = submitQuizAnswer(course, state, selectedOptionIds);

  return {
    state: nextState,
    trace: {
      step: action.step,
      action: "select",
      value: [...selectedOptionIds],
      nextStep: nextState.currentNodeId,
    },
  };
}

function evaluateExpectations(
  expected: CourseLogicTestExpectations,
  actual: CourseLogicTestActualOutcome
): CourseLogicTestIssue[] {
  const issues: CourseLogicTestIssue[] = [];

  if (
    expected.terminalStep !== undefined &&
    actual.terminalStep !== expected.terminalStep
  ) {
    issues.push({
      severity: "error",
      code: "terminal-step-mismatch",
      message: `Expected terminal step "${expected.terminalStep}" but reached "${actual.terminalStep}".`,
    });
  }

  if (expected.score !== undefined && actual.score !== expected.score) {
    issues.push({
      severity: "error",
      code: "score-mismatch",
      message: `Expected score ${expected.score} but the learner finished with ${actual.score}.`,
    });
  }

  if (
    expected.scoreAtLeast !== undefined &&
    actual.score < expected.scoreAtLeast
  ) {
    issues.push({
      severity: "error",
      code: "score-threshold-mismatch",
      message: `Expected score >= ${expected.scoreAtLeast} but the learner finished with ${actual.score}.`,
    });
  }

  if (
    expected.completionStatus !== undefined &&
    actual.completionStatus !== expected.completionStatus
  ) {
    issues.push({
      severity: "error",
      code: "completion-status-mismatch",
      message: `Expected completion status "${expected.completionStatus}" but actual status was "${actual.completionStatus}".`,
    });
  }

  if (
    expected.successStatus !== undefined &&
    actual.successStatus !== expected.successStatus
  ) {
    issues.push({
      severity: "error",
      code: "success-status-mismatch",
      message: `Expected success status "${expected.successStatus}" but actual status was "${actual.successStatus}".`,
    });
  }

  if (
    expected.pathLength !== undefined &&
    actual.pathLength !== expected.pathLength
  ) {
    issues.push({
      severity: "error",
      code: "path-length-mismatch",
      message: `Expected path length ${expected.pathLength} but actual path length was ${actual.pathLength}.`,
    });
  }

  Object.entries(expected.variables ?? {}).forEach(([key, value]) => {
    if (actual.variables[key] !== value) {
      issues.push({
        severity: "error",
        code: "variable-mismatch",
        message: `Expected variable "${key}" to equal "${String(value)}" but actual value was "${String(actual.variables[key])}".`,
      });
    }
  });

  Object.entries(expected.state ?? {}).forEach(([key, value]) => {
    if (actual.state[key] !== value) {
      issues.push({
        severity: "error",
        code: "state-mismatch",
        message: `Expected scenario state "${key}" to equal "${String(value)}" but actual value was "${String(actual.state[key])}".`,
      });
    }
  });

  return issues;
}

function runSingleTest(input: {
  course: CompiledCourse;
  suite: CourseLogicTestSuite;
  testCase: CourseLogicTestCase;
  selection: CourseProjectBuildSelection;
  templateData: Record<string, TemplateScalarValue>;
  runtimeWarnings: readonly string[];
}): CourseLogicTestResult {
  const validationIssues = validateTestCase(input.course, input.testCase);
  const warnings: CourseLogicTestIssue[] = [];

  if (validationIssues.length > 0) {
    return {
      suiteId: input.suite.id,
      suiteTitle: input.suite.title,
      suiteSourcePath: input.suite.sourcePath,
      testId: input.testCase.id,
      name: input.testCase.name,
      description: input.testCase.description,
      tags: input.testCase.tags,
      targetKey: buildTargetKey(input.selection),
      selection: input.selection,
      courseId: input.course.id,
      courseTitle: input.course.title,
      success: false,
      warnings,
      errors: validationIssues,
      expected: input.testCase.expect,
      actual: {
        terminalStep: input.course.startNodeId,
        score: 0,
        completionStatus: "incomplete",
        successStatus: "none",
        pathLength: 1,
        variables: buildRuntimeVariableMap({
          course: input.course,
          state: initializeRuntime(input.course),
          templateData: input.templateData,
        }),
        state: initializeRuntime(input.course).scenarioState,
        pathTaken: [input.course.startNodeId],
      },
      actionTrace: [],
      runtimeWarnings: input.runtimeWarnings,
    };
  }

  let state = initializeRuntime(input.course);

  if (input.testCase.initialState) {
    state = {
      ...state,
      currentNodeId:
        input.testCase.initialState.currentNodeId ?? state.currentNodeId,
      score: input.testCase.initialState.score ?? state.score,
      completed: input.testCase.initialState.completed ?? state.completed,
      scenarioState: {
        ...state.scenarioState,
        ...(input.testCase.initialState.state ?? {}),
      },
      history: [
        ...(input.testCase.initialState.currentNodeId
          ? [input.testCase.initialState.currentNodeId]
          : state.history),
      ],
    };
  }

  const actionTrace: CourseLogicTestActionTrace[] = [];
  const errors: CourseLogicTestIssue[] = [];

  try {
    input.testCase.actions.forEach((action) => {
      const result = simulateAction(input.course, state, action);
      state = result.state;
      actionTrace.push(result.trace);
    });
  } catch (error) {
    errors.push({
      severity: "error",
      code: "simulation-error",
      message:
        error instanceof Error ? error.message : "Course logic simulation failed.",
    });
  }

  const actual: CourseLogicTestActualOutcome = {
    terminalStep: state.currentNodeId,
    score: state.score,
    completionStatus: deriveCompletionStatus(state),
    successStatus: deriveSuccessStatus(input.course, state),
    pathLength: state.history.length,
    variables: buildRuntimeVariableMap({
      course: input.course,
      state,
      templateData: input.templateData,
    }),
    state: { ...state.scenarioState },
    pathTaken: [...state.history],
  };

  errors.push(...evaluateExpectations(input.testCase.expect, actual));

  return {
    suiteId: input.suite.id,
    suiteTitle: input.suite.title,
    suiteSourcePath: input.suite.sourcePath,
    testId: input.testCase.id,
    name: input.testCase.name,
    description: input.testCase.description,
    tags: input.testCase.tags,
    targetKey: buildTargetKey(input.selection),
    selection: input.selection,
    courseId: input.course.id,
    courseTitle: input.course.title,
    success: errors.length === 0,
    warnings,
    errors,
    expected: input.testCase.expect,
    actual,
    actionTrace,
    runtimeWarnings: input.runtimeWarnings,
  };
}

function buildCoverage(results: readonly CourseLogicTestResult[]): CourseLogicTestCoverageSummary[] {
  const coverageByTarget = new Map<
    string,
    {
      courseId: string;
      courseTitle: string;
      visited: Set<string>;
      interactive: Set<string>;
    }
  >();

  results.forEach((result) => {
    const current =
      coverageByTarget.get(result.targetKey) ?? {
        courseId: result.courseId,
        courseTitle: result.courseTitle,
        visited: new Set<string>(),
        interactive: new Set<string>(),
      };

    result.actual.pathTaken.forEach((step) => current.visited.add(step));
    result.actionTrace.forEach((trace) => current.interactive.add(trace.step));
    coverageByTarget.set(result.targetKey, current);
  });

  return [...coverageByTarget.entries()]
    .map(([targetKey, summary]) => ({
      targetKey,
      courseId: summary.courseId,
      courseTitle: summary.courseTitle,
      visitedSteps: [...summary.visited].sort((leftStep, rightStep) =>
        leftStep.localeCompare(rightStep)
      ),
      interactiveSteps: [...summary.interactive].sort((leftStep, rightStep) =>
        leftStep.localeCompare(rightStep)
      ),
      untestedInteractiveSteps: [],
    }))
    .sort((leftCoverage, rightCoverage) =>
      leftCoverage.targetKey.localeCompare(rightCoverage.targetKey)
    );
}

function finalizeCoverage(
  coverage: readonly CourseLogicTestCoverageSummary[],
  courseMap: Map<string, CompiledCourse>
): CourseLogicTestCoverageSummary[] {
  return coverage.map((summary) => {
    const course = courseMap.get(summary.targetKey);

    if (!course) {
      return summary;
    }

    const interactiveSteps = Object.values(course.nodes)
      .filter((node) => node.type === "choice" || node.type === "quiz")
      .map((node) => node.id)
      .sort((leftStep, rightStep) => leftStep.localeCompare(rightStep));
    const interactedSet = new Set(summary.interactiveSteps);

    return {
      ...summary,
      interactiveSteps,
      untestedInteractiveSteps: interactiveSteps.filter(
        (step) => !interactedSet.has(step)
      ),
    };
  });
}

function buildSummaryMarkdown(report: CourseProjectLogicTestReport): string {
  const lines = [
    "# Course Logic Test Summary",
    "",
    `- Project: \`${report.projectId}\``,
    `- Generated at: \`${report.generatedAt}\``,
    `- Test suites: ${report.totalSuites}`,
    `- Total tests: ${report.totalTests}`,
    `- Passed: ${report.passedTests}`,
    `- Failed: ${report.failedTests}`,
    `- Warnings: ${report.warningCount}`,
    `- Errors: ${report.errorCount}`,
    "",
    "## Results",
    "",
  ];

  report.results.forEach((result) => {
    lines.push(
      `- ${result.success ? "PASS" : "FAIL"} \`${result.targetKey}\` :: ${result.suiteId}/${result.testId} -> terminal \`${result.actual.terminalStep}\`, score ${result.actual.score}`
    );
    result.errors.forEach((error) => {
      lines.push(`  - error: ${error.message}`);
    });
  });

  if (report.coverage.length > 0) {
    lines.push("", "## Coverage", "");
    report.coverage.forEach((coverage) => {
      lines.push(
        `- \`${coverage.targetKey}\`: visited ${coverage.visitedSteps.length} step(s), untested interactive step(s): ${
          coverage.untestedInteractiveSteps.length > 0
            ? coverage.untestedInteractiveSteps
                .map((step) => `\`${step}\``)
                .join(", ")
            : "none"
        }`
      );
    });
  }

  return lines.join("\n");
}

export function runCourseProjectLogicTests(
  project: CourseProject,
  options: CourseProjectLogicTestRunOptions = {}
): CourseProjectLogicTestRun {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const moduleLibrary = options.moduleLibrary ?? null;
  const selectionFilters =
    options.selections && options.selections.length > 0
      ? options.selections
      : options.selection
        ? [options.selection]
        : null;
  const warnings: CourseLogicTestIssue[] = project.logicTestLoadIssues.map((message) => ({
    severity: "warning",
    code: "logic-test-load-issue",
    message,
  }));
  const results: CourseLogicTestResult[] = [];
  const courseMap = new Map<string, CompiledCourse>();

  project.logicTestSuites.forEach((suite) => {
    suite.tests.forEach((testCase) => {
      const selection = mergeTargets(project, suite.targetDefaults, testCase.target);

      if (
        selectionFilters &&
        !selectionFilters.some((filter) => matchesSelection(selection, filter))
      ) {
        return;
      }

      try {
        const resolvedSelection = resolveCourseProjectBuildSelection(project, selection, {
          moduleLibrary,
        });

        courseMap.set(
          buildTargetKey(selection),
          resolvedSelection.snapshot.exportModel!
        );

        results.push(
          runSingleTest({
            course: resolvedSelection.snapshot.exportModel!,
            suite,
            testCase,
            selection,
            templateData: resolvedSelection.variant.values,
            runtimeWarnings: resolvedSelection.snapshot.warnings,
          })
        );
      } catch (error) {
        results.push({
          suiteId: suite.id,
          suiteTitle: suite.title,
          suiteSourcePath: suite.sourcePath,
          testId: testCase.id,
          name: testCase.name,
          description: testCase.description,
          tags: testCase.tags,
          targetKey: buildTargetKey(selection),
          selection,
          courseId: selection.templateId,
          courseTitle: selection.templateId,
          success: false,
          warnings: [],
          errors: [
            {
              severity: "error",
              code: "target-resolution-failed",
              message:
                error instanceof Error
                  ? error.message
                  : "The requested template, variant, or theme could not be resolved.",
              suiteId: suite.id,
              testId: testCase.id,
              targetKey: buildTargetKey(selection),
            },
          ],
          expected: testCase.expect,
          actual: {
            terminalStep: selection.templateId,
            score: 0,
            completionStatus: "incomplete",
            successStatus: "none",
            pathLength: 0,
            variables: {},
            state: {},
            pathTaken: [],
          },
          actionTrace: [],
          runtimeWarnings: [],
        });
      }
    });
  });

  const coverage = finalizeCoverage(buildCoverage(results), courseMap);
  const errors = results.flatMap((result) => result.errors);
  const allWarnings = [
    ...warnings,
    ...results.flatMap((result) => result.warnings),
    ...results.flatMap((result) =>
      result.runtimeWarnings.map((warning) => ({
        severity: "warning" as const,
        code: "runtime-warning",
        message: warning,
        suiteId: result.suiteId,
        testId: result.testId,
        targetKey: result.targetKey,
      }))
    ),
  ];
  const report: CourseProjectLogicTestReport = {
    command: "test",
    projectId: project.id,
    projectTitle: project.title,
    projectVersion: project.version,
    generatedAt,
    success: errors.length === 0,
    totalSuites: project.logicTestSuites.length,
    totalTests: results.length,
    passedTests: results.filter((result) => result.success).length,
    failedTests: results.filter((result) => !result.success).length,
    warningCount: allWarnings.length,
    errorCount: errors.length,
    outputPaths: [
      buildLogicTestReportPath(project),
      buildLogicTestSummaryPath(project),
    ],
    warnings: allWarnings,
    errors,
    results,
    coverage,
  };
  const summaryMarkdown = buildSummaryMarkdown(report);

  return {
    report,
    artifacts: [
      {
        path: buildLogicTestReportPath(project),
        kind: "logic-test-report",
        contents: JSON.stringify(report, null, 2),
      },
      {
        path: buildLogicTestSummaryPath(project),
        kind: "logic-test-summary",
        contents: summaryMarkdown,
      },
    ],
    summaryMarkdown,
  };
}

export function runAllCourseProjectLogicTests(
  projects: readonly CourseProject[],
  options: Omit<CourseProjectLogicTestRunOptions, "selection" | "selections"> = {}
): CourseProjectLogicTestRun[] {
  return projects.map((project) =>
    runCourseProjectLogicTests(project, options)
  );
}

export function findAffectedSelectionsWithLogicTests(
  project: CourseProject,
  selections: readonly CourseProjectBuildSelection[]
): CourseProjectBuildSelection[] {
  const allowedTargets = new Set(selections.map((selection) => buildTargetKey(selection)));

  return listCourseProjectBuildSelections(project).filter((selection) =>
    allowedTargets.has(buildTargetKey(selection))
  );
}
