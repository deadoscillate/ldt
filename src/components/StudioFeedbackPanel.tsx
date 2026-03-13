"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from "react";

import { BRAND } from "@/lib/app/brand";
import { trackClientEvent } from "@/lib/events/client";
import {
  feedbackRequestSchema,
  type FeedbackContext,
  type FeedbackScreenshot,
  type FeedbackType,
} from "@/lib/intake/schema";
import {
  buildFeedbackContextSummary,
  buildScreenshotLabel,
  STUDIO_FEEDBACK_TYPES,
} from "@/lib/studio/feedback";
import { captureElementScreenshot } from "@/lib/studio/screenshot";

interface StudioFeedbackPanelProps {
  captureTargetRef: RefObject<HTMLElement | null>;
  context: FeedbackContext;
}

interface FeedbackBannerState {
  tone: "success" | "error" | "info";
  title: string;
  message: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The screenshot could not be read."));
    };
    reader.onerror = () => {
      reject(new Error("The screenshot could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

export function StudioFeedbackPanel({
  captureTargetRef,
  context,
}: StudioFeedbackPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("confusion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState<FeedbackScreenshot | null>(null);
  const [banner, setBanner] = useState<FeedbackBannerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const contextSummary = buildFeedbackContextSummary(context);

  function handleTogglePanel(): void {
    const nextOpenState = !isOpen;

    setIsOpen(nextOpenState);

    if (nextOpenState) {
      trackClientEvent(
        "feedback_panel_opened",
        {
          screen: context.currentScreen ?? "studio",
        },
        "studio"
      );
    }
  }

  async function handleScreenshotUpload(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setBanner({
        tone: "error",
        title: "Unsupported screenshot",
        message: "Use a PNG, JPG, or WebP screenshot.",
      });
      event.currentTarget.value = "";
      return;
    }

    if (file.size > 1_500_000) {
      setBanner({
        tone: "error",
        title: "Screenshot too large",
        message: "Keep screenshots under roughly 1.5 MB.",
      });
      event.currentTarget.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setScreenshot({
        dataUrl,
        fileName: file.name,
        mimeType: file.type as FeedbackScreenshot["mimeType"],
      });
      setBanner({
        tone: "info",
        title: "Screenshot attached",
        message: "The screenshot will only be uploaded if you submit this feedback.",
      });
    } catch (error) {
      setBanner({
        tone: "error",
        title: "Screenshot failed",
        message:
          error instanceof Error
            ? error.message
            : "The screenshot could not be attached.",
      });
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleCaptureStudio(): Promise<void> {
    if (!captureTargetRef.current) {
      setBanner({
        tone: "error",
        title: "Capture unavailable",
        message: "The current studio view could not be captured.",
      });
      return;
    }

    setIsCapturing(true);

    try {
      const capturedScreenshot = await captureElementScreenshot(captureTargetRef.current, {
        fileName: `sapio-forge-studio-${Date.now()}.png`,
      });

      setScreenshot(capturedScreenshot);
      setBanner({
        tone: "info",
        title: "Studio screenshot captured",
        message: "A PNG snapshot of the current studio view is ready to send with this report.",
      });
    } catch (error) {
      setBanner({
        tone: "error",
        title: "Capture failed",
        message:
          error instanceof Error
            ? error.message
            : "The current studio view could not be captured.",
      });
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = feedbackRequestSchema.safeParse({
      feedbackType,
      message,
      email,
      source: "studio",
      sourcePage: typeof window !== "undefined" ? window.location.pathname : "/studio",
      context,
      screenshot: screenshot ?? undefined,
    });

    if (!parsed.success) {
      setBanner({
        tone: "error",
        title: "Feedback needs one more fix",
        message:
          parsed.error.issues[0]?.message ??
          "Add a short note so the beta feedback can be reviewed.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Feedback could not be submitted.");
      }

      setMessage("");
      setEmail("");
      setScreenshot(null);
      setBanner({
        tone: "success",
        title: "Feedback recorded",
        message:
          "Thanks. Your beta feedback was saved with the current studio context so it can be reviewed quickly.",
      });
      trackClientEvent(
        "feedback_submitted",
        {
          feedbackType,
          hasEmail: Boolean(parsed.data.email),
          hasScreenshot: Boolean(parsed.data.screenshot),
          screen: context.currentScreen ?? "studio",
        },
        "studio"
      );
    } catch (error) {
      setBanner({
        tone: "error",
        title: "Feedback failed",
        message:
          error instanceof Error
            ? error.message
            : "Feedback could not be submitted.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="feedback-fab"
        onClick={handleTogglePanel}
        type="button"
      >
        Send Feedback
      </button>

      {isOpen ? (
        <aside className="feedback-drawer" aria-label="Send beta feedback">
          <div className="feedback-drawer-header">
            <div>
              <p className="eyebrow">Beta Feedback</p>
              <h2>Tell us where {BRAND.studioName} slows you down.</h2>
            </div>
            <button
              aria-label="Close feedback panel"
              className="ghost-button"
              onClick={handleTogglePanel}
              type="button"
            >
              Close
            </button>
          </div>

          <p className="panel-copy">
            {BRAND.productName} is currently in beta. Feedback helps improve the system.
          </p>
          <p className="waitlist-note">
            We log lightweight product events. No course content or screenshots are uploaded
            unless you submit them here explicitly.
          </p>

          <div className="feedback-context-grid">
            {contextSummary.map((item) => (
              <article className="summary-card" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </article>
            ))}
          </div>

          <form className="feedback-form studio-feedback-form" noValidate onSubmit={(submitEvent) => void handleSubmit(submitEvent)}>
            <label className="waitlist-label" htmlFor="studio-feedback-type">
              Feedback type
            </label>
            <select
              className="waitlist-select"
              id="studio-feedback-type"
              onChange={(changeEvent) =>
                setFeedbackType(changeEvent.target.value as FeedbackType)
              }
              value={feedbackType}
            >
              {STUDIO_FEEDBACK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="waitlist-note">
              {
                STUDIO_FEEDBACK_TYPES.find((type) => type.value === feedbackType)?.description
              }
            </p>

            <label className="waitlist-label" htmlFor="studio-feedback-message">
              What happened?
            </label>
            <textarea
              className="feedback-textarea"
              id="studio-feedback-message"
              onChange={(changeEvent) => setMessage(changeEvent.target.value)}
              placeholder="Example: I switched to Source definition, fixed a node, and expected Compiled preview to refresh automatically."
              rows={5}
              value={message}
            />

            <label className="waitlist-label" htmlFor="studio-feedback-email">
              Email address (optional)
            </label>
            <input
              autoComplete="email"
              className="waitlist-input"
              id="studio-feedback-email"
              inputMode="email"
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
              placeholder="name@company.com"
              type="email"
              value={email}
            />

            <div className="button-row feedback-attachment-row">
              <button
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Attach screenshot
              </button>
              <button
                className="ghost-button"
                disabled={isCapturing}
                onClick={() => void handleCaptureStudio()}
                type="button"
              >
                {isCapturing ? "Capturing..." : "Capture current studio"}
              </button>
              {screenshot ? (
                <button
                  className="ghost-button"
                  onClick={() => setScreenshot(null)}
                  type="button"
                >
                  Remove screenshot
                </button>
              ) : null}
            </div>

            <input
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(changeEvent) => void handleScreenshotUpload(changeEvent)}
              ref={fileInputRef}
              type="file"
            />

            {screenshot ? (
              <div className="feedback-screenshot-preview">
                <img alt="Feedback attachment preview" src={screenshot.dataUrl} />
                <p className="waitlist-note">{buildScreenshotLabel(screenshot)}</p>
              </div>
            ) : null}

            <button className="primary-button feedback-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending..." : "Send beta feedback"}
            </button>
          </form>

          {banner ? (
            <div className={`feedback-banner feedback-${banner.tone}`}>
              <strong>{banner.title}</strong>
              <span>{banner.message}</span>
            </div>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
