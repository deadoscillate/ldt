import type {
  ChoiceNodeDocument,
  ContentNodeDocument,
  CourseDocument,
  CourseDocumentNode,
  QuizNodeDocument,
  ResultNodeDocument,
} from "@/lib/course/schema";
import type {
  CompiledCourse,
  CompiledEdge,
  CompiledNode,
  CompiledQuizNode,
} from "@/lib/course/types";

export class CourseCompilationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Course compilation failed.");
    this.name = "CourseCompilationError";
    this.issues = issues;
  }
}

function nodeMaxScore(node: CourseDocumentNode): number {
  switch (node.type) {
    case "choice":
      return Math.max(0, ...node.options.map((option) => option.score ?? 0));
    case "quiz":
      return Math.max(0, node.correctScore ?? 0);
    default:
      return 0;
  }
}

function pushEdge(
  edges: CompiledEdge[],
  issues: string[],
  nodeIds: Set<string>,
  from: string,
  to: string | undefined,
  label: string
): void {
  if (!to) {
    return;
  }

  if (!nodeIds.has(to)) {
    issues.push(`Node "${from}" references missing node "${to}" via "${label}".`);
    return;
  }

  edges.push({ from, to, label });
}

function compileContentNode(node: ContentNodeDocument): CompiledNode {
  return {
    id: node.id,
    type: "content",
    title: node.title,
    body: node.body ?? "",
    next: node.next ?? null,
  };
}

function compileChoiceNode(node: ChoiceNodeDocument): CompiledNode {
  return {
    id: node.id,
    type: "choice",
    title: node.title,
    body: node.body ?? "",
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      next: option.next,
      score: option.score ?? 0,
    })),
  };
}

function compileQuizNode(node: QuizNodeDocument): CompiledQuizNode {
  return {
    id: node.id,
    type: "quiz",
    title: node.title,
    body: node.body ?? "",
    question: node.question,
    multiple: node.multiple ?? false,
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      correct: option.correct,
    })),
    correctScore: node.correctScore ?? 10,
    incorrectScore: node.incorrectScore ?? 0,
    passNext: node.passNext ?? null,
    failNext: node.failNext ?? null,
    next: node.next ?? null,
  };
}

function compileResultNode(node: ResultNodeDocument): CompiledNode {
  return {
    id: node.id,
    type: "result",
    title: node.title,
    body: node.body ?? "",
    outcome: node.outcome ?? "neutral",
  };
}

function compileNode(node: CourseDocumentNode): CompiledNode {
  switch (node.type) {
    case "content":
      return compileContentNode(node);
    case "choice":
      return compileChoiceNode(node);
    case "quiz":
      return compileQuizNode(node);
    case "result":
      return compileResultNode(node);
  }
}

function validateNodeSpecificRules(node: CourseDocumentNode, issues: string[]): void {
  if (node.type === "quiz") {
    const correctOptions = node.options.filter((option) => option.correct);

    if (correctOptions.length === 0) {
      issues.push(`Quiz "${node.id}" must mark at least one option as correct.`);
    }
  }
}

export function compileCourse(document: CourseDocument): CompiledCourse {
  const issues: string[] = [];
  const nodes: Record<string, CompiledNode> = {};
  const nodeIds = new Set<string>();
  const edges: CompiledEdge[] = [];

  for (const node of document.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push(`Duplicate node id "${node.id}".`);
      continue;
    }

    nodeIds.add(node.id);
    validateNodeSpecificRules(node, issues);
    nodes[node.id] = compileNode(node);
  }

  if (!nodeIds.has(document.start)) {
    issues.push(`Start node "${document.start}" does not exist.`);
  }

  if (!document.nodes.some((node) => node.type === "result")) {
    issues.push("Course must include at least one result node.");
  }

  for (const node of document.nodes) {
    switch (node.type) {
      case "content":
        pushEdge(edges, issues, nodeIds, node.id, node.next, "next");
        break;
      case "choice":
        for (const option of node.options) {
          pushEdge(
            edges,
            issues,
            nodeIds,
            node.id,
            option.next,
            `option:${option.id}`
          );
        }
        break;
      case "quiz":
        pushEdge(edges, issues, nodeIds, node.id, node.passNext, "passNext");
        pushEdge(edges, issues, nodeIds, node.id, node.failNext, "failNext");
        pushEdge(edges, issues, nodeIds, node.id, node.next, "next");
        break;
      case "result":
        break;
    }
  }

  const maxScore = document.nodes.reduce(
    (score, node) => score + nodeMaxScore(node),
    0
  );

  if (document.passingScore > maxScore) {
    issues.push(
      `Passing score ${document.passingScore} exceeds the compiled max score ${maxScore}.`
    );
  }

  if (issues.length > 0) {
    throw new CourseCompilationError(issues);
  }

  return {
    id: document.id,
    title: document.title,
    description: document.description ?? "",
    startNodeId: document.start,
    passingScore: document.passingScore,
    maxScore,
    nodeOrder: document.nodes.map((node) => node.id),
    edges,
    nodes,
  };
}

export function serializeCompiledCourse(course: CompiledCourse): string {
  return JSON.stringify(course, null, 2);
}
