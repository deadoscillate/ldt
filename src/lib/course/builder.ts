import yaml from "js-yaml";

import type {
  CalloutBlockDocument,
  CourseTemplateDocument,
  LayoutColumnDocument,
  MediaDocument,
  QuoteBlockDocument,
  TemplateScalarValue,
} from "@/lib/course/schema";
import type {
  CompiledCalloutBlock,
  CompiledCourse,
  CompiledLayoutColumn,
  CompiledMedia,
  CompiledNode,
  CompiledQuoteBlock,
  CourseLayoutType,
  PublicAuthorNodeType,
} from "@/lib/course/types";

export interface BuilderChoiceOption {
  id: string;
  label: string;
  next: string;
  score: string;
  correct: boolean;
}

export interface BuilderNode {
  id: string;
  type: PublicAuthorNodeType;
  title: string;
  body: string;
  layout: CourseLayoutType;
  next: string;
  prompt: string;
  multiple: boolean;
  correctScore: string;
  incorrectScore: string;
  passNext: string;
  failNext: string;
  outcome: "passed" | "failed" | "neutral";
  mediaType: "image" | "video";
  mediaSrc: string;
  mediaAlt: string;
  mediaCaption: string;
  leftTitle: string;
  leftText: string;
  leftImage: string;
  leftVideo: string;
  rightTitle: string;
  rightText: string;
  rightImage: string;
  rightVideo: string;
  quoteText: string;
  quoteAttribution: string;
  calloutTitle: string;
  calloutText: string;
  options: BuilderChoiceOption[];
}

export interface BuilderCourse {
  id: string;
  title: string;
  description: string;
  start: string;
  passingScore: string;
  nodes: BuilderNode[];
}

function normalizeMedia(media: CompiledMedia | null): Pick<
  BuilderNode,
  "mediaType" | "mediaSrc" | "mediaAlt" | "mediaCaption"
> {
  return {
    mediaType: media?.type ?? "image",
    mediaSrc: media?.src ?? "",
    mediaAlt: media?.alt ?? "",
    mediaCaption: media?.caption ?? "",
  };
}

function normalizeColumns(
  left: CompiledLayoutColumn | null,
  right: CompiledLayoutColumn | null
): Pick<
  BuilderNode,
  | "leftTitle"
  | "leftText"
  | "leftImage"
  | "leftVideo"
  | "rightTitle"
  | "rightText"
  | "rightImage"
  | "rightVideo"
> {
  return {
    leftTitle: left?.title ?? "",
    leftText: left?.text ?? "",
    leftImage: left?.image ?? "",
    leftVideo: left?.video ?? "",
    rightTitle: right?.title ?? "",
    rightText: right?.text ?? "",
    rightImage: right?.image ?? "",
    rightVideo: right?.video ?? "",
  };
}

function normalizeQuote(quote: CompiledQuoteBlock | null): Pick<
  BuilderNode,
  "quoteText" | "quoteAttribution"
> {
  return {
    quoteText: quote?.text ?? "",
    quoteAttribution: quote?.attribution ?? "",
  };
}

function normalizeCallout(callout: CompiledCalloutBlock | null): Pick<
  BuilderNode,
  "calloutTitle" | "calloutText"
> {
  return {
    calloutTitle: callout?.title ?? "",
    calloutText: callout?.text ?? "",
  };
}

function inferDefaultLayout(node: CompiledNode): CourseLayoutType {
  if (node.layout) {
    return node.layout;
  }

  switch (node.type) {
    case "quiz":
      return "question";
    case "result":
      return "result";
    default:
      return "text";
  }
}

function compiledNodeToBuilderNode(node: CompiledNode): BuilderNode {
  const columnFields = normalizeColumns(node.left, node.right);

  return {
    id: node.id,
    type:
      node.type === "quiz"
        ? node.sourceType === "question"
          ? "question"
          : "question"
        : node.type === "choice"
          ? node.sourceType === "branch"
            ? "branch"
            : "choice"
          : node.type,
    title: node.title,
    body: node.body,
    layout: inferDefaultLayout(node),
    next: node.type === "content" ? node.next ?? "" : "",
    prompt: node.type === "quiz" ? node.question : "",
    multiple: node.type === "quiz" ? node.multiple : false,
    correctScore: node.type === "quiz" ? String(node.correctScore) : "10",
    incorrectScore: node.type === "quiz" ? String(node.incorrectScore) : "0",
    passNext: node.type === "quiz" ? node.passNext ?? "" : "",
    failNext: node.type === "quiz" ? node.failNext ?? "" : "",
    outcome: node.type === "result" ? node.outcome : "neutral",
    ...normalizeMedia(node.media),
    ...columnFields,
    ...normalizeQuote(node.quote),
    ...normalizeCallout(node.callout),
    options:
      node.type === "choice"
        ? node.options.map((option) => ({
            id: option.id,
            label: option.label,
            next: option.next,
            score: String(option.score),
            correct: false,
          }))
        : node.type === "quiz"
          ? node.options.map((option) => ({
              id: option.id,
              label: option.label,
              next: "",
              score: "0",
              correct: option.correct,
            }))
          : [],
  };
}

function toMediaDocument(node: BuilderNode): MediaDocument | undefined {
  if (!node.mediaSrc.trim()) {
    return undefined;
  }

  return {
    type: node.mediaType,
    src: node.mediaSrc.trim(),
    alt: node.mediaAlt.trim() || undefined,
    caption: node.mediaCaption.trim() || undefined,
  };
}

function toColumnDocument(
  title: string,
  text: string,
  image: string,
  video: string
): LayoutColumnDocument | undefined {
  const nextColumn: LayoutColumnDocument = {};

  if (title.trim()) {
    nextColumn.title = title.trim();
  }

  if (text.trim()) {
    nextColumn.text = text.trim();
  }

  if (image.trim()) {
    nextColumn.image = image.trim();
  }

  if (video.trim()) {
    nextColumn.video = video.trim();
  }

  return Object.keys(nextColumn).length > 0 ? nextColumn : undefined;
}

function toQuoteDocument(node: BuilderNode): QuoteBlockDocument | undefined {
  if (!node.quoteText.trim()) {
    return undefined;
  }

  return {
    text: node.quoteText.trim(),
    attribution: node.quoteAttribution.trim() || undefined,
  };
}

function toCalloutDocument(node: BuilderNode): CalloutBlockDocument | undefined {
  if (!node.calloutText.trim()) {
    return undefined;
  }

  return {
    title: node.calloutTitle.trim() || undefined,
    text: node.calloutText.trim(),
  };
}

function withPresentation(node: BuilderNode) {
  return {
    layout: node.layout,
    media: toMediaDocument(node),
    left: toColumnDocument(
      node.leftTitle,
      node.leftText,
      node.leftImage,
      node.leftVideo
    ),
    right: toColumnDocument(
      node.rightTitle,
      node.rightText,
      node.rightImage,
      node.rightVideo
    ),
    quote: toQuoteDocument(node),
    callout: toCalloutDocument(node),
  };
}

export function compiledCourseToBuilderCourse(course: CompiledCourse): BuilderCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    start: course.startNodeId,
    passingScore: String(course.passingScore),
    nodes: course.nodeOrder.map((nodeId) =>
      compiledNodeToBuilderNode(course.nodes[nodeId])
    ),
  };
}

export function createEmptyBuilderNode(
  index: number,
  type: BuilderNode["type"] = "content"
): BuilderNode {
  return {
    id: `step-${index + 1}`,
    type,
    title: type === "result" ? "Result" : "New step",
    body: "",
    layout:
      type === "result"
        ? "result"
        : type === "question"
          ? "question"
          : "text",
    next: "",
    prompt: "",
    multiple: false,
    correctScore: "10",
    incorrectScore: "0",
    passNext: "",
    failNext: "",
    outcome: "neutral",
    mediaType: "image",
    mediaSrc: "",
    mediaAlt: "",
    mediaCaption: "",
    leftTitle: "",
    leftText: "",
    leftImage: "",
    leftVideo: "",
    rightTitle: "",
    rightText: "",
    rightImage: "",
    rightVideo: "",
    quoteText: "",
    quoteAttribution: "",
    calloutTitle: "",
    calloutText: "",
    options:
      type === "choice" || type === "branch"
        ? [
            { id: "option-a", label: "First path", next: "", score: "0", correct: false },
            { id: "option-b", label: "Second path", next: "", score: "0", correct: false },
          ]
        : type === "question"
          ? [
              { id: "correct", label: "Correct answer", next: "", score: "0", correct: true },
              { id: "incorrect", label: "Distractor", next: "", score: "0", correct: false },
            ]
          : [],
  };
}

export function createEmptyBuilderCourse(): BuilderCourse {
  const introNode = createEmptyBuilderNode(0, "content");
  introNode.id = "intro";
  introNode.title = "Welcome";
  introNode.body = "Introduce the learner to the scenario.";
  introNode.next = "result";

  const resultNode = createEmptyBuilderNode(1, "result");
  resultNode.id = "result";
  resultNode.title = "Complete";
  resultNode.outcome = "neutral";
  resultNode.body = "Course complete.";

  return {
    id: "new-training-course",
    title: "New Training Course",
    description: "Describe the training scenario.",
    start: "intro",
    passingScore: "0",
    nodes: [introNode, resultNode],
  };
}

export function builderCourseToTemplateDocument(
  builderCourse: BuilderCourse,
  templateData: Record<string, TemplateScalarValue> = {}
): CourseTemplateDocument {
  return {
    id: builderCourse.id,
    title: builderCourse.title,
    description: builderCourse.description,
    start: builderCourse.start,
    passingScore: builderCourse.passingScore,
    templateData,
    nodes: builderCourse.nodes.map((node) => {
      const baseNode = {
        id: node.id,
        title: node.title,
        body: node.body || undefined,
        ...withPresentation(node),
      };

      switch (node.type) {
        case "content":
          return {
            ...baseNode,
            type: "content" as const,
            next: node.next.trim() || undefined,
          };
        case "choice":
        case "branch":
          return {
            ...baseNode,
            type: node.type,
            options: node.options.map((option) => ({
              id: option.id,
              label: option.label,
              next: option.next,
              score: option.score,
            })),
          };
        case "question":
          return {
            ...baseNode,
            type: "question" as const,
            prompt: node.prompt,
            multiple: node.multiple,
            options: node.options.map((option) => ({
              id: option.id,
              label: option.label,
              correct: option.correct,
            })),
            correctScore: node.correctScore,
            incorrectScore: node.incorrectScore,
            passNext: node.passNext.trim() || undefined,
            failNext: node.failNext.trim() || undefined,
            next: node.next.trim() || undefined,
          };
        case "result":
          return {
            ...baseNode,
            type: "result" as const,
            outcome: node.outcome,
          };
      }
    }),
  };
}

export function builderCourseToYaml(
  builderCourse: BuilderCourse,
  templateData: Record<string, TemplateScalarValue> = {}
): string {
  return yaml.dump(builderCourseToTemplateDocument(builderCourse, templateData), {
    noRefs: true,
    lineWidth: -1,
    sortKeys: false,
  });
}
