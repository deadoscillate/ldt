import { APP_VERSION } from "@/lib/app/version";
import type {
  FeedbackContext,
  FeedbackScreenshot,
  FeedbackType,
  StudioScreen,
} from "@/lib/intake/schema";

export interface StudioFeedbackDefinition {
  value: FeedbackType;
  label: string;
  description: string;
}

export const STUDIO_FEEDBACK_TYPES: readonly StudioFeedbackDefinition[] = [
  {
    value: "bug",
    label: "Bug",
    description: "Something broke or behaved differently than you expected.",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    description: "You have an idea that would make authoring or export smoother.",
  },
  {
    value: "confusion",
    label: "Confusion",
    description: "A label, workflow, or system concept was hard to understand.",
  },
  {
    value: "question",
    label: "Question",
    description: "You were unsure what to do next or how something works.",
  },
] as const;

export function buildBrowserInfo(
  navigatorLike: Pick<Navigator, "userAgent" | "language"> & {
    userAgentData?: { platform?: string };
    platform?: string;
  }
): NonNullable<FeedbackContext["browser"]> {
  return {
    userAgent: navigatorLike.userAgent,
    language: navigatorLike.language,
    platform:
      navigatorLike.userAgentData?.platform ??
      navigatorLike.platform ??
      "",
  };
}

export function buildStudioFeedbackContext(input: {
  currentScreen: StudioScreen;
  pagePath: string;
  projectId?: string | null;
  projectTitle?: string | null;
  templateId?: string | null;
  templateTitle?: string | null;
  variantId?: string | null;
  variantTitle?: string | null;
  themeId?: string | null;
  themeName?: string | null;
  clientId?: string | null;
  sessionId?: string | null;
  browser?: FeedbackContext["browser"];
}): FeedbackContext {
  return {
    currentScreen: input.currentScreen,
    pagePath: input.pagePath,
    projectId: input.projectId ?? "",
    projectTitle: input.projectTitle ?? "",
    templateId: input.templateId ?? "",
    templateTitle: input.templateTitle ?? "",
    variantId: input.variantId ?? "",
    variantTitle: input.variantTitle ?? "",
    themeId: input.themeId ?? "",
    themeName: input.themeName ?? "",
    appVersion: APP_VERSION,
    clientId: input.clientId ?? "",
    sessionId: input.sessionId ?? "",
    browser: input.browser,
  };
}

export function buildFeedbackContextSummary(
  context: FeedbackContext
): Array<{ label: string; value: string }> {
  return [
    {
      label: "Screen",
      value: context.currentScreen ?? "studio",
    },
    {
      label: "Project",
      value: context.projectTitle || context.projectId || "No project selected",
    },
    {
      label: "Template",
      value: context.templateTitle || context.templateId || "No template selected",
    },
    {
      label: "Variant",
      value: context.variantTitle || context.variantId || "No variant selected",
    },
    {
      label: "Theme",
      value: context.themeName || context.themeId || "No theme selected",
    },
  ];
}

export function buildScreenshotLabel(
  screenshot: FeedbackScreenshot | null | undefined
): string {
  if (!screenshot) {
    return "No screenshot attached";
  }

  return `${screenshot.fileName} (${screenshot.mimeType})`;
}
