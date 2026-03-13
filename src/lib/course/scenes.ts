import { z } from "zod";

import type {
  AuthorSceneShell,
  CompiledCalloutBlock,
  CompiledChoiceNode,
  CompiledDashboardCard,
  CompiledLayoutColumn,
  CompiledMedia,
  CompiledNode,
  CompiledQuoteBlock,
  CompiledScene,
  CompiledSceneComponent,
  CompiledShellInteraction,
  CompiledQuizNode,
  CourseLayoutType,
  SceneComponentSlot,
  SceneLayoutShell,
} from "@/lib/course/types";
import {
  SCENE_COMPONENT_SLOTS,
  SCENE_COMPONENT_TYPES,
  SCENE_LAYOUT_SHELLS,
} from "@/lib/course/types";

const sceneLayoutSchema = z.enum(SCENE_LAYOUT_SHELLS);
const sceneComponentSlotSchema = z.enum(SCENE_COMPONENT_SLOTS);
const sceneConditionSchema = z
  .object({
    variable: z.string().trim().min(1),
    equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
    notEquals: z.union([z.string(), z.number(), z.boolean()]).optional(),
    oneOf: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1).optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
  })
  .strict();
const componentVisibilityShape = {
  visibleWhen: z.array(sceneConditionSchema).nullable().optional(),
} as const;

const titleComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("title"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

const paragraphComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("paragraph"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
    tone: z.enum(["body", "muted"]),
  })
  .strict();

const imageComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("image"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    mediaType: z.enum(["image", "video"]),
    src: z.string().trim().min(1),
    alt: z.string(),
    caption: z.string(),
  })
  .strict();

const calloutComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("callout"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    title: z.string(),
    text: z.string().trim().min(1),
    variant: z.enum(["info", "warning", "success"]),
  })
  .strict();

const buttonComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("button"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    label: z.string().trim().min(1),
    variant: z.enum(["primary", "secondary"]),
    actionId: z.string().nullable(),
    disabled: z.boolean(),
  })
  .strict();

const questionBlockComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("question_block"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    prompt: z.string().trim().min(1),
    multiple: z.boolean(),
    helperText: z.string(),
  })
  .strict();

const resultCardComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("result_card"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    outcome: z.enum(["passed", "failed", "neutral"]),
    summary: z.string().trim().min(1),
  })
  .strict();

const quoteComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("quote"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
    attribution: z.string(),
  })
  .strict();

const dividerComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("divider"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    label: z.string(),
  })
  .strict();

const listComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("list"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    items: z.array(z.string().trim().min(1)).min(1),
    ordered: z.boolean(),
  })
  .strict();

const emailHeaderComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("email_header"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    from: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    previewText: z.string(),
  })
  .strict();

const emailBodyComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("email_body"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
  })
  .strict();

const emailAttachmentListComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("email_attachment_list"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    attachments: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const emailWarningBannerComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("email_warning_banner"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
    severity: z.enum(["warning", "info"]),
  })
  .strict();

const chatMessageComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("chat_message"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    sender: z.string().trim().min(1),
    text: z.string().trim().min(1),
    timestamp: z.string(),
    role: z.enum(["self", "other"]),
  })
  .strict();

const chatSystemNoticeComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("chat_system_notice"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
  })
  .strict();

const cardComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("card"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    title: z.string().trim().min(1),
    text: z.string(),
    status: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const metricComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("metric"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    label: z.string().trim().min(1),
    value: z.string().trim().min(1),
    tone: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const statusBadgeComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("status_badge"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    label: z.string().trim().min(1),
    status: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const panelTitleComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("panel_title"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    text: z.string().trim().min(1),
  })
  .strict();

const dashboardNoticeComponentSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.literal("dashboard_notice"),
    slot: sceneComponentSlotSchema,
    ...componentVisibilityShape,
    title: z.string(),
    text: z.string().trim().min(1),
    variant: z.enum(["info", "warning", "success"]),
  })
  .strict();

const baseInteractiveComponentShape = {
  id: z.string().trim().min(1),
  slot: sceneComponentSlotSchema,
  ...componentVisibilityShape,
  optionId: z.string().trim().min(1),
  actionMode: z.enum(["trigger", "toggle"]),
  feedback: z.string(),
  correct: z.boolean().nullable(),
  scoreDelta: z.number().nullable(),
  nextNodeId: z.string().nullable(),
};

const emailLinkComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("email_link"),
    label: z.string().trim().min(1),
    hrefLabel: z.string(),
  })
  .strict();

const emailAttachmentComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("email_attachment"),
    label: z.string().trim().min(1),
    fileName: z.string(),
  })
  .strict();

const emailActionButtonComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("email_action_button"),
    label: z.string().trim().min(1),
    variant: z.enum(["primary", "secondary"]),
  })
  .strict();

const chatReplyOptionComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("chat_reply_option"),
    label: z.string().trim().min(1),
  })
  .strict();

const chatChoiceMessageComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("chat_choice_message"),
    sender: z.string().trim().min(1),
    text: z.string().trim().min(1),
    timestamp: z.string(),
    role: z.enum(["self", "other"]),
  })
  .strict();

const dashboardActionCardComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("dashboard_action_card"),
    title: z.string().trim().min(1),
    text: z.string(),
    status: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const dashboardFlagToggleComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("dashboard_flag_toggle"),
    label: z.string().trim().min(1),
    status: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const dashboardReviewItemComponentSchema = z
  .object({
    ...baseInteractiveComponentShape,
    type: z.literal("dashboard_review_item"),
    title: z.string().trim().min(1),
    text: z.string(),
    status: z.enum(["neutral", "warning", "positive", "danger"]),
  })
  .strict();

const sceneComponentSchema = z.discriminatedUnion("type", [
  titleComponentSchema,
  paragraphComponentSchema,
  imageComponentSchema,
  calloutComponentSchema,
  buttonComponentSchema,
  questionBlockComponentSchema,
  resultCardComponentSchema,
  quoteComponentSchema,
  dividerComponentSchema,
  listComponentSchema,
  emailHeaderComponentSchema,
  emailBodyComponentSchema,
  emailAttachmentListComponentSchema,
  emailWarningBannerComponentSchema,
  chatMessageComponentSchema,
  chatSystemNoticeComponentSchema,
  cardComponentSchema,
  metricComponentSchema,
  statusBadgeComponentSchema,
  panelTitleComponentSchema,
  dashboardNoticeComponentSchema,
  emailLinkComponentSchema,
  emailAttachmentComponentSchema,
  emailActionButtonComponentSchema,
  chatReplyOptionComponentSchema,
  chatChoiceMessageComponentSchema,
  dashboardActionCardComponentSchema,
  dashboardFlagToggleComponentSchema,
  dashboardReviewItemComponentSchema,
]);

const compiledSceneSchema = z
  .object({
    id: z.string().trim().min(1),
    layout: sceneLayoutSchema,
    components: z.array(sceneComponentSchema),
    metadata: z
      .object({
        sourceLayout: z.string().nullable(),
        sourceNodeType: z.string().trim().min(1),
        sourceAuthorType: z.string().trim().min(1),
        renderedFromLegacy: z.boolean(),
        mediaPlacement: z.enum(["left", "right", "main"]).nullable(),
      })
      .strict(),
  })
  .strict();

function componentId(nodeId: string, suffix: string): string {
  return `${nodeId}__${suffix}`;
}

function detectListItems(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !lines.every((line) => /^[-*]\s+/.test(line))) {
    return null;
  }

  return lines.map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean);
}

function createTextComponent(
  nodeId: string,
  suffix: string,
  text: string | null | undefined,
  slot: SceneComponentSlot = "main",
  tone: "body" | "muted" = "body"
): CompiledSceneComponent[] {
  const normalized = text?.trim();

  if (!normalized) {
    return [];
  }

  const listItems = detectListItems(normalized);

  if (listItems) {
    return [
      {
        id: componentId(nodeId, `${suffix}-list`),
        type: "list",
        slot,
        items: listItems,
        ordered: false,
      },
    ];
  }

  return [
    {
      id: componentId(nodeId, suffix),
      type: "paragraph",
      slot,
      text: normalized,
      tone,
    },
  ];
}

function createMediaComponent(
  nodeId: string,
  suffix: string,
  media: CompiledMedia | null,
  slot: SceneComponentSlot
): CompiledSceneComponent[] {
  if (!media?.src) {
    return [];
  }

  return [
    {
      id: componentId(nodeId, suffix),
      type: "image",
      slot,
      mediaType: media.type,
      src: media.src,
      alt: media.alt,
      caption: media.caption,
    },
  ];
}

function createQuoteComponent(
  nodeId: string,
  quote: CompiledQuoteBlock | null,
  slot: SceneComponentSlot = "main"
): CompiledSceneComponent[] {
  if (!quote?.text.trim()) {
    return [];
  }

  return [
    {
      id: componentId(nodeId, "quote"),
      type: "quote",
      slot,
      text: quote.text,
      attribution: quote.attribution,
    },
  ];
}

function createCalloutComponent(
  nodeId: string,
  callout: CompiledCalloutBlock | null,
  slot: SceneComponentSlot = "main",
  variant: "info" | "warning" | "success" = "warning"
): CompiledSceneComponent[] {
  if (!callout?.text.trim()) {
    return [];
  }

  return [
    {
      id: componentId(nodeId, "callout"),
      type: "callout",
      slot,
      visibleWhen: callout.visibleWhen,
      title: callout.title,
      text: callout.text,
      variant,
    },
  ];
}

function createColumnComponents(
  nodeId: string,
  suffix: "left" | "right",
  column: CompiledLayoutColumn | null,
  slot: SceneComponentSlot
): CompiledSceneComponent[] {
  if (!column) {
    return [];
  }

  const components: CompiledSceneComponent[] = [];

  if (column.title.trim()) {
    components.push({
      id: componentId(nodeId, `${suffix}-title`),
      type: "title",
      slot,
      text: column.title,
      level: 3,
    });
  }

  components.push(
    ...createTextComponent(nodeId, `${suffix}-text`, column.text, slot)
  );

  if (column.image?.trim()) {
    components.push({
      id: componentId(nodeId, `${suffix}-image`),
      type: "image",
      slot,
      mediaType: "image",
      src: column.image,
      alt: "",
      caption: "",
    });
  }

  if (column.video?.trim()) {
    components.push({
      id: componentId(nodeId, `${suffix}-video`),
      type: "image",
      slot,
      mediaType: "video",
      src: column.video,
      alt: "",
      caption: "",
    });
  }

  return components;
}

function inferSceneLayout(node: CompiledNode): SceneLayoutShell {
  if (node.shell) {
    return node.shell;
  }

  if (node.type === "result" || node.layout === "result") {
    return "result_shell";
  }

  if (
    node.layout === "two-column" ||
    node.layout === "image-left" ||
    node.layout === "image-right"
  ) {
    return "two_column";
  }

  if (node.layout === "quote" || node.layout === "callout") {
    return "stacked";
  }

  return "card";
}

function inferMediaPlacement(layout: CourseLayoutType | null): "left" | "right" | "main" | null {
  if (layout === "image-left") {
    return "left";
  }

  if (layout === "image-right") {
    return "right";
  }

  if (layout === "image" || layout === "video") {
    return "main";
  }

  return null;
}

function createMainComponents(node: CompiledNode): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [];

  if (node.title.trim()) {
    components.push({
      id: componentId(node.id, "title"),
      type: "title",
      slot: "main",
      text: node.title,
      level: 2,
    });
  }

  if (
    node.layout !== "two-column" &&
    node.layout !== "image-left" &&
    node.layout !== "image-right"
  ) {
    components.push(...createTextComponent(node.id, "body", node.body, "main"));
  }

  if (
    node.layout !== "image-left" &&
    node.layout !== "image-right" &&
    node.layout !== "two-column"
  ) {
    components.push(...createMediaComponent(node.id, "media", node.media, "main"));
  }

  components.push(...createQuoteComponent(node.id, node.quote));
  components.push(...createCalloutComponent(node.id, node.callout));

  if (node.type === "quiz") {
    components.push({
      id: componentId(node.id, "question"),
      type: "question_block",
      slot: "main",
      prompt: node.question,
      multiple: node.multiple,
      helperText: node.multiple
        ? "Select all responses that apply."
        : "Select the best answer.",
    });
  }

  if (node.type === "result") {
    components.push({
      id: componentId(node.id, "result"),
      type: "result_card",
      slot: "main",
      outcome: node.outcome,
      summary:
        node.outcome === "passed"
          ? "This path finishes with a passing outcome."
          : node.outcome === "failed"
            ? "This path finishes with a failed outcome."
            : "This path finishes without pass/fail scoring.",
    });
  }

  return components;
}

function createTwoColumnComponents(node: CompiledNode): CompiledSceneComponent[] {
  const components = createMainComponents({
    ...node,
    body: "",
    media: null,
  });

  if (node.layout === "image-left") {
    components.push(...createMediaComponent(node.id, "media", node.media, "left"));
    if (node.right) {
      components.push(...createColumnComponents(node.id, "right", node.right, "right"));
    } else {
      components.push(...createTextComponent(node.id, "body-right", node.body, "right"));
    }
    return components;
  }

  if (node.layout === "image-right") {
    if (node.left) {
      components.push(...createColumnComponents(node.id, "left", node.left, "left"));
    } else {
      components.push(...createTextComponent(node.id, "body-left", node.body, "left"));
    }
    components.push(...createMediaComponent(node.id, "media", node.media, "right"));
    return components;
  }

  components.push(...createColumnComponents(node.id, "left", node.left, "left"));
  components.push(...createColumnComponents(node.id, "right", node.right, "right"));
  return components;
}

function createFooterLogicComponents(
  node: CompiledNode,
  slot: SceneComponentSlot = "footer"
): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [];

  if (node.type === "quiz") {
    components.push({
      id: componentId(node.id, "question"),
      type: "question_block",
      slot,
      prompt: node.question,
      multiple: node.multiple,
      helperText: node.multiple
        ? "Select all responses that apply."
        : "Select the best answer.",
    });
  }

  if (node.type === "result") {
    components.push({
      id: componentId(node.id, "result"),
      type: "result_card",
      slot,
      outcome: node.outcome,
      summary:
        node.outcome === "passed"
          ? "This path finishes with a passing outcome."
          : node.outcome === "failed"
            ? "This path finishes with a failed outcome."
            : "This path finishes without pass/fail scoring.",
    });
  }

  return components;
}

function buildInteractionSceneMeta(
  node: CompiledNode,
  interaction: CompiledShellInteraction
) {
  if (node.type === "choice") {
    const option = (node as CompiledChoiceNode).options.find(
      (candidate) => candidate.id === interaction.optionId
    );

    return {
      actionMode: "trigger" as const,
      feedback: interaction.feedback || option?.feedback || "",
      correct: null,
      scoreDelta: option?.score ?? null,
      nextNodeId: option?.next ?? null,
    };
  }

  if (node.type === "quiz") {
    const option = (node as CompiledQuizNode).options.find(
      (candidate) => candidate.id === interaction.optionId
    );

    return {
      actionMode: "toggle" as const,
      feedback: interaction.feedback || option?.feedback || "",
      correct: option?.correct ?? null,
      scoreDelta: null,
      nextNodeId: null,
    };
  }

  return {
    actionMode: "trigger" as const,
    feedback: interaction.feedback,
    correct: null,
    scoreDelta: null,
    nextNodeId: null,
  };
}

function createShellInteractionComponents(node: CompiledNode): CompiledSceneComponent[] {
  return node.interactions.map((interaction) => {
    const meta = buildInteractionSceneMeta(node, interaction);

    switch (interaction.type) {
      case "email_link":
        return {
          id: interaction.id,
          type: "email_link",
          slot: "main",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          label: interaction.label,
          hrefLabel: interaction.hrefLabel,
        };
      case "email_attachment":
        return {
          id: interaction.id,
          type: "email_attachment",
          slot: "main",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          label: interaction.label,
          fileName: interaction.fileName,
        };
      case "email_action_button":
        return {
          id: interaction.id,
          type: "email_action_button",
          slot: "footer",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          label: interaction.label,
          variant: interaction.variant,
        };
      case "chat_reply_option":
        return {
          id: interaction.id,
          type: "chat_reply_option",
          slot: "footer",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          label: interaction.label,
        };
      case "chat_choice_message":
        return {
          id: interaction.id,
          type: "chat_choice_message",
          slot: "main",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          sender: interaction.sender,
          text: interaction.text,
          timestamp: interaction.timestamp,
          role: interaction.role,
        };
      case "dashboard_action_card":
        return {
          id: interaction.id,
          type: "dashboard_action_card",
          slot: "main",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          title: interaction.title,
          text: interaction.text,
          status: interaction.status,
        };
      case "dashboard_flag_toggle":
        return {
          id: interaction.id,
          type: "dashboard_flag_toggle",
          slot: "sidebar",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          label: interaction.label,
          status: interaction.status,
        };
      case "dashboard_review_item":
        return {
          id: interaction.id,
          type: "dashboard_review_item",
          slot: "main",
          visibleWhen: interaction.visibleWhen ?? null,
          optionId: interaction.optionId,
          actionMode: meta.actionMode,
          feedback: meta.feedback,
          correct: meta.correct,
          scoreDelta: meta.scoreDelta,
          nextNodeId: meta.nextNodeId,
          title: interaction.title,
          text: interaction.text,
          status: interaction.status,
        };
    }
  });
}

function createEmailShellComponents(node: CompiledNode): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [];

  if (node.title.trim()) {
    components.push({
      id: componentId(node.id, "panel-title"),
      type: "panel_title",
      slot: "header",
      visibleWhen: null,
      text: node.title,
    });
  }

  if (node.emailShell) {
    components.push({
      id: componentId(node.id, "email-header"),
      type: "email_header",
      slot: "header",
      visibleWhen: null,
      from: node.emailShell.from,
      subject: node.emailShell.subject,
      previewText: node.emailShell.previewText,
    });

    if (node.emailShell.warningBanner.trim()) {
      components.push({
        id: componentId(node.id, "email-warning"),
        type: "email_warning_banner",
        slot: "header",
        visibleWhen: node.emailShell.warningBannerVisibleWhen,
        text: node.emailShell.warningBanner,
        severity: "warning",
      });
    }

    if (node.emailShell.attachments.length > 0) {
      components.push({
        id: componentId(node.id, "email-attachments"),
        type: "email_attachment_list",
        slot: "main",
        visibleWhen: null,
        attachments: node.emailShell.attachments,
      });
    }
  }

  if (node.body.trim()) {
    components.push({
      id: componentId(node.id, "email-body"),
      type: "email_body",
      slot: "main",
      visibleWhen: null,
      text: node.body,
    });
  }

  components.push(...createMediaComponent(node.id, "media", node.media, "main"));
  components.push(...createCalloutComponent(node.id, node.callout, "main"));
  components.push(...createQuoteComponent(node.id, node.quote, "main"));
  components.push(...createShellInteractionComponents(node));
  components.push(...createFooterLogicComponents(node));

  return components;
}

function createChatShellComponents(node: CompiledNode): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [];

  if (node.chatShell?.title.trim() || node.title.trim()) {
    components.push({
      id: componentId(node.id, "panel-title"),
      type: "panel_title",
      slot: "header",
      visibleWhen: null,
      text: node.chatShell?.title.trim() || node.title,
    });
  }

  if (node.chatShell?.systemNotice.trim()) {
    components.push({
      id: componentId(node.id, "chat-notice"),
      type: "chat_system_notice",
      slot: "header",
      visibleWhen: node.chatShell.systemNoticeVisibleWhen,
      text: node.chatShell.systemNotice,
    });
  }

  (node.chatShell?.messages ?? []).forEach((message, index) => {
    components.push({
      id: componentId(node.id, `chat-message-${index + 1}`),
      type: "chat_message",
      slot: "main",
      visibleWhen: message.visibleWhen,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      role: message.role,
    });
  });

  components.push(...createTextComponent(node.id, "body", node.body, "main"));
  components.push(...createShellInteractionComponents(node));
  components.push(...createCalloutComponent(node.id, node.callout, "footer"));
  components.push(...createQuoteComponent(node.id, node.quote, "footer"));
  components.push(...createFooterLogicComponents(node));

  return components;
}

function createDashboardCardComponents(
  nodeId: string,
  card: CompiledDashboardCard,
  index: number
): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [
    {
      id: componentId(nodeId, `dashboard-card-${index + 1}`),
      type: "card",
      slot: "main",
      visibleWhen: card.visibleWhen,
      title: card.title,
      text: card.text,
      status: card.status,
    },
  ];

  if (card.metricLabel.trim() && card.metricValue.trim()) {
    components.push({
      id: componentId(nodeId, `dashboard-metric-${index + 1}`),
      type: "metric",
      slot: "main",
      visibleWhen: card.visibleWhen,
      label: card.metricLabel,
      value: card.metricValue,
      tone: card.status,
    });
  }

  components.push({
    id: componentId(nodeId, `dashboard-status-${index + 1}`),
    type: "status_badge",
    slot: "main",
    visibleWhen: card.visibleWhen,
    label: card.status,
    status: card.status,
  });

  return components;
}

function createDashboardShellComponents(node: CompiledNode): CompiledSceneComponent[] {
  const components: CompiledSceneComponent[] = [];

  if (node.dashboardShell?.title.trim() || node.title.trim()) {
    components.push({
      id: componentId(node.id, "panel-title"),
      type: "panel_title",
      slot: "header",
      visibleWhen: null,
      text: node.dashboardShell?.title.trim() || node.title,
    });
  }

  if (node.dashboardShell?.navItems.length) {
    components.push({
      id: componentId(node.id, "dashboard-nav"),
      type: "list",
      slot: "sidebar",
      visibleWhen: null,
      items: node.dashboardShell.navItems,
      ordered: false,
    });
  }

  if (node.dashboardShell?.notice.trim()) {
    components.push({
      id: componentId(node.id, "dashboard-notice"),
      type: "dashboard_notice",
      slot: "header",
      visibleWhen: node.dashboardShell.noticeVisibleWhen,
      title: "Dashboard notice",
      text: node.dashboardShell.notice,
      variant: "info",
    });
  }

  (node.dashboardShell?.cards ?? []).forEach((card, index) => {
    components.push(...createDashboardCardComponents(node.id, card, index));
  });

  components.push(...createTextComponent(node.id, "body", node.body, "main"));
  components.push(...createShellInteractionComponents(node));
  components.push(...createCalloutComponent(node.id, node.callout, "footer"));
  components.push(...createFooterLogicComponents(node));

  return components;
}

export function createSceneForNode(node: CompiledNode): CompiledScene {
  const layout = inferSceneLayout(node);
  const components =
    layout === "email_shell"
      ? createEmailShellComponents(node)
      : layout === "chat_shell"
        ? createChatShellComponents(node)
        : layout === "dashboard_shell"
          ? createDashboardShellComponents(node)
          : layout === "two_column"
            ? createTwoColumnComponents(node)
            : createMainComponents(node);

  return {
    id: `${node.id}-scene`,
    layout,
    components,
    metadata: {
      sourceLayout: node.layout,
      sourceNodeType: node.type,
      sourceAuthorType: node.sourceType,
      renderedFromLegacy: node.shell === null,
      mediaPlacement: inferMediaPlacement(node.layout),
    },
  };
}

function formatSceneIssue(path: PropertyKey[], message: string): string {
  const prefix =
    path.length === 0 ? "scene" : path.map((segment) => String(segment)).join(".");
  return `${prefix}: ${message}`;
}

export function validateCompiledScene(scene: CompiledScene): string[] {
  const parsedScene = compiledSceneSchema.safeParse(scene);

  if (!parsedScene.success) {
    return parsedScene.error.issues.map((issue) =>
      formatSceneIssue(issue.path, issue.message)
    );
  }

  const unsupportedComponents = scene.components.filter(
    (component) => !SCENE_COMPONENT_TYPES.includes(component.type)
  );

  if (unsupportedComponents.length > 0) {
    return unsupportedComponents.map(
      (component) => `components.${component.id}: Unknown component type "${component.type}".`
    );
  }

  if (
    scene.layout === "two_column" &&
    !scene.components.some(
      (component) => component.slot === "left" || component.slot === "right"
    )
  ) {
    return ["scene.layout: Two-column scenes must include left or right slot components."];
  }

  return [];
}

export function validateNodeScene(node: CompiledNode): string[] {
  return validateCompiledScene(node.scene).map(
    (issue) => `Node "${node.id}" scene error: ${issue}`
  );
}

function allowedComponentsForShell(
  layout: SceneLayoutShell
): ReadonlySet<CompiledSceneComponent["type"]> | null {
  switch (layout) {
    case "email_shell":
      return new Set([
        "panel_title",
        "email_header",
        "email_body",
        "email_attachment_list",
        "email_warning_banner",
        "button",
        "callout",
        "question_block",
        "result_card",
        "quote",
        "image",
        "paragraph",
        "email_link",
        "email_attachment",
        "email_action_button",
      ]);
    case "chat_shell":
      return new Set([
        "panel_title",
        "chat_message",
        "chat_system_notice",
        "button",
        "callout",
        "question_block",
        "result_card",
        "paragraph",
        "quote",
        "chat_reply_option",
        "chat_choice_message",
      ]);
    case "dashboard_shell":
      return new Set([
        "panel_title",
        "dashboard_notice",
        "card",
        "metric",
        "status_badge",
        "button",
        "question_block",
        "paragraph",
        "list",
        "callout",
        "result_card",
        "dashboard_action_card",
        "dashboard_flag_toggle",
        "dashboard_review_item",
      ]);
    default:
      return null;
  }
}

function requiredComponentGroupsForShell(layout: SceneLayoutShell): string[][] {
  switch (layout) {
    case "email_shell":
      return [["email_header"], ["email_body", "paragraph"]];
    case "chat_shell":
      return [["chat_message"], ["panel_title", "title"]];
    case "dashboard_shell":
      return [["card", "metric", "dashboard_notice"], ["panel_title", "title"]];
    default:
      return [];
  }
}

export function collectNodeSceneWarnings(node: CompiledNode): string[] {
  const warnings: string[] = [];
  const allowed = allowedComponentsForShell(node.scene.layout);

  if (allowed) {
    node.scene.components
      .filter((component) => !allowed.has(component.type))
      .forEach((component) => {
        warnings.push(
          `Node "${node.id}" uses shell "${node.scene.layout}" with component "${component.type}". This is allowed, but consider a shell-specific component for a more realistic simulation frame.`
        );
      });
  }

  requiredComponentGroupsForShell(node.scene.layout).forEach((group) => {
    const hasMatch = node.scene.components.some((component) =>
      group.includes(component.type)
    );

    if (!hasMatch) {
      warnings.push(
        `Node "${node.id}" uses shell "${node.scene.layout}" but is missing an expected shell component (${group.join(" or ")}).`
      );
    }
  });

  if (node.scene.layout === "dashboard_shell" && node.scene.components.every((component) => component.slot !== "sidebar")) {
    warnings.push(
      `Node "${node.id}" uses shell "dashboard_shell" without any sidebar content. Add nav items or related support content for a stronger dashboard simulation.`
    );
  }

  if (
    (node.scene.layout === "email_shell" ||
      node.scene.layout === "chat_shell" ||
      node.scene.layout === "dashboard_shell") &&
    (node.type === "choice" || node.type === "quiz") &&
    node.interactions.length === 0
  ) {
    warnings.push(
      `Node "${node.id}" uses shell "${node.scene.layout}" without shell-specific interactions. Add structured shell actions so learners can act inside the simulation frame.`
    );
  }

  return warnings;
}
