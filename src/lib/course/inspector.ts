import type { TemplateFieldDefinition } from "@/lib/course/template";
import type { CompiledCourse } from "@/lib/course/types";

export interface ValidationState {
  label: string;
  valid: boolean;
}

export interface StructureInspectorData {
  courseId: string;
  title: string;
  startNodeId: string;
  variableCount: number;
  scenarioStateCount: number;
  scenarioStateKeys: string[];
  nodeCount: number;
  sceneCount: number;
  sceneLayouts: string[];
  componentCount: number;
  componentTypes: string[];
  nodeTypes: string[];
  validationStates: ValidationState[];
}

function hasMatchingIssue(errors: string[], matcher: RegExp): boolean {
  return errors.some((issue) => matcher.test(issue));
}

export function buildValidationStates(
  errors: string[],
  isReadyToExport: boolean
): ValidationState[] {
  const schemaErrors = hasMatchingIssue(
    errors,
    /(Value is required|At least|Expected|Use letters|must mark at least one option as correct|does not define)/i
  );
  const referenceErrors = hasMatchingIssue(
    errors,
    /(references missing node|does not exist|via "next"|via "passNext"|via "failNext"|Duplicate node id)/i
  );
  const templateErrors = hasMatchingIssue(
    errors,
    /missing placeholder/i
  );

  return [
    {
      label: "Schema valid",
      valid: !schemaErrors,
    },
    {
      label: "References resolved",
      valid: !referenceErrors,
    },
    {
      label: "Template variables resolved",
      valid: !templateErrors,
    },
    {
      label: "Ready to export",
      valid: isReadyToExport,
    },
  ];
}

export function buildStructureInspectorData(input: {
  course: CompiledCourse | null;
  templateFields: TemplateFieldDefinition[];
  errors: string[];
  isReadyToExport: boolean;
}): StructureInspectorData {
  const course = input.course;
  const nodeTypes = course
    ? [...new Set(course.nodeOrder.map((nodeId) => course.nodes[nodeId]?.sourceType))]
        .filter(Boolean)
        .sort()
    : [];
  const sceneLayouts = course
    ? [...new Set(course.nodeOrder.map((nodeId) => course.nodes[nodeId]?.scene.layout))]
        .filter(Boolean)
        .sort()
    : [];
  const componentTypes = course
    ? [
        ...new Set(
          course.nodeOrder.flatMap(
            (nodeId) => course.nodes[nodeId]?.scene.components.map((component) => component.type) ?? []
          )
        ),
      ].sort()
    : [];
  const componentCount = course
    ? course.nodeOrder.reduce(
        (count, nodeId) => count + (course.nodes[nodeId]?.scene.components.length ?? 0),
        0
      )
    : 0;

  return {
    courseId: course?.id ?? "Unavailable",
    title: course?.title ?? "Unavailable",
    startNodeId: course?.startNodeId ?? "Unavailable",
    variableCount: input.templateFields.length,
    scenarioStateCount: course?.scenarioStateOrder.length ?? 0,
    scenarioStateKeys: course?.scenarioStateOrder ?? [],
    nodeCount: course?.nodeOrder.length ?? 0,
    sceneCount: course?.nodeOrder.length ?? 0,
    sceneLayouts,
    componentCount,
    componentTypes,
    nodeTypes,
    validationStates: buildValidationStates(input.errors, input.isReadyToExport),
  };
}
