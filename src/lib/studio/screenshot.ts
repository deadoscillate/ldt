import { toPng } from "html-to-image";

import type { FeedbackScreenshot } from "@/lib/intake/schema";

export interface ScreenshotCaptureOptions {
  render?: (
    node: HTMLElement,
    options: {
      backgroundColor: string;
      cacheBust: boolean;
      pixelRatio: number;
      canvasWidth: number;
      canvasHeight: number;
    }
  ) => Promise<string>;
  fileName?: string;
  backgroundColor?: string;
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function captureElementScreenshot(
  element: HTMLElement,
  options: ScreenshotCaptureOptions = {}
): Promise<FeedbackScreenshot> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const renderer = options.render ?? toPng;
  const dataUrl = await renderer(element, {
    backgroundColor: options.backgroundColor ?? "#0b0f14",
    cacheBust: true,
    pixelRatio:
      typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1,
    canvasWidth: width,
    canvasHeight: height,
  });

  return {
    dataUrl,
    fileName:
      options.fileName ??
      `${sanitizeFileName(
        typeof document !== "undefined"
          ? document.title || "sapio-forge-studio"
          : "sapio-forge-studio"
      ) || "sapio-forge-studio"}-${Date.now()}.png`,
    mimeType: "image/png",
  };
}
