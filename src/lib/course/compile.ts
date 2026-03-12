import type {
  BranchNodeDocument,
  ChoiceNodeDocument,
  ContentNodeDocument,
  CourseDocument,
  CourseDocumentNode,
  QuestionNodeDocument,
  QuizNodeDocument,
  ResultNodeDocument,
  ThemeDocument,
} from "@/lib/course/schema";
import type {
  CompiledCalloutBlock,
  CompiledCourse,
  CompiledEdge,
  CompiledLayoutColumn,
  CompiledMedia,
  CompiledNode,
  CompiledQuoteBlock,
  CompiledQuizNode,
  CompiledTheme,
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
    case "branch":
      return Math.max(0, ...node.options.map((option) => option.score ?? 0));
    case "quiz":
    case "question":
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

function normalizeMedia(node: CourseDocumentNode): CompiledMedia | null {
  if (!node.media) {
    return null;
  }

  return {
    type: node.media.type,
    src: node.media.src,
    alt: node.media.alt ?? "",
    caption: node.media.caption ?? "",
  };
}

function normalizeColumn(
  column: CourseDocumentNode["left"] | CourseDocumentNode["right"]
): CompiledLayoutColumn | null {
  if (!column) {
    return null;
  }

  return {
    title: column.title ?? "",
    text: column.text ?? "",
    image: column.image ?? null,
    video: column.video ?? null,
  };
}

function normalizeQuote(node: CourseDocumentNode): CompiledQuoteBlock | null {
  if (!node.quote) {
    return null;
  }

  return {
    text: node.quote.text,
    attribution: node.quote.attribution ?? "",
  };
}

function normalizeCallout(node: CourseDocumentNode): CompiledCalloutBlock | null {
  if (!node.callout) {
    return null;
  }

  return {
    title: node.callout.title ?? "",
    text: node.callout.text,
  };
}

function createBaseNode(node: CourseDocumentNode) {
  return {
    id: node.id,
    title: node.title,
    body: node.body ?? "",
    layout: node.layout ?? null,
    media: normalizeMedia(node),
    left: normalizeColumn(node.left),
    right: normalizeColumn(node.right),
    quote: normalizeQuote(node),
    callout: normalizeCallout(node),
  };
}

function compileContentNode(node: ContentNodeDocument): CompiledNode {
  return {
    ...createBaseNode(node),
    type: "content",
    sourceType: "content",
    next: node.next ?? null,
  };
}

function compileChoiceLikeNode(
  node: ChoiceNodeDocument | BranchNodeDocument
): CompiledNode {
  return {
    ...createBaseNode(node),
    type: "choice",
    sourceType: node.type,
    options: node.options.map((option) => ({
      id: option.id,
      label: option.label,
      next: option.next,
      score: option.score ?? 0,
    })),
  };
}

function compileQuizLikeNode(
  node: QuizNodeDocument | QuestionNodeDocument
): CompiledQuizNode {
  return {
    ...createBaseNode(node),
    type: "quiz",
    sourceType: node.type,
    question: node.type === "question" ? node.prompt : node.question,
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
    ...createBaseNode(node),
    type: "result",
    sourceType: "result",
    outcome: node.outcome ?? "neutral",
  };
}

function compileNode(node: CourseDocumentNode): CompiledNode {
  switch (node.type) {
    case "content":
      return compileContentNode(node);
    case "choice":
    case "branch":
      return compileChoiceLikeNode(node);
    case "quiz":
    case "question":
      return compileQuizLikeNode(node);
    case "result":
      return compileResultNode(node);
  }
}

function normalizeTheme(theme: ThemeDocument | undefined): CompiledTheme {
  return {
    primary: theme?.primary ?? null,
    secondary: theme?.secondary ?? null,
    font: theme?.font ?? null,
    logo: theme?.logo ?? null,
    background: theme?.background ?? null,
  };
}

function validateLayoutConfiguration(
  node: CourseDocumentNode,
  issues: string[]
): void {
  switch (node.layout) {
    case "image":
    case "video":
      if (!node.media) {
        issues.push(
          `Node "${node.id}" uses layout "${node.layout}" but does not define media.`
        );
      }
      break;
    case "two-column":
    case "image-left":
    case "image-right":
      if (!node.left && !node.right && !node.media) {
        issues.push(
          `Node "${node.id}" uses layout "${node.layout}" but does not define left/right column content.`
        );
      }
      break;
    case "quote":
      if (!node.quote) {
        issues.push(`Node "${node.id}" uses layout "quote" but does not define quote text.`);
      }
      break;
    case "callout":
      if (!node.callout) {
        issues.push(
          `Node "${node.id}" uses layout "callout" but does not define callout content.`
        );
      }
      break;
    case "question":
      if (node.type !== "quiz" && node.type !== "question") {
        issues.push(
          `Node "${node.id}" uses layout "question" but is not a quiz or question node.`
        );
      }
      break;
    case "result":
      if (node.type !== "result") {
        issues.push(
          `Node "${node.id}" uses layout "result" but is not a result node.`
        );
      }
      break;
    default:
      break;
  }
}

function validateNodeSpecificRules(node: CourseDocumentNode, issues: string[]): void {
  if (node.type === "quiz" || node.type === "question") {
    const correctOptions = node.options.filter((option) => option.correct);

    if (correctOptions.length === 0) {
      issues.push(`Quiz "${node.id}" must mark at least one option as correct.`);
    }
  }

  validateLayoutConfiguration(node, issues);
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
      case "branch":
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
      case "question":
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
    theme: normalizeTheme(document.theme),
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
