"use client";

import { useState, type FormEvent } from "react";

import { trackClientEvent } from "@/lib/events/client";
import { feedbackRequestSchema } from "@/lib/intake/schema";

interface FeedbackState {
  tone: "success" | "error";
  title: string;
  message: string;
}

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = feedbackRequestSchema.safeParse({
      message,
      email,
      sourcePage: typeof window !== "undefined" ? window.location.pathname : "",
      source: "landing-page",
    });

    if (!parsed.success) {
      setFeedback({
        tone: "error",
        title: "Feedback required",
        message:
          parsed.error.issues[0]?.message ??
          "Share a short note about what you need this tool to handle.",
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
        throw new Error(payload.error ?? "Feedback could not be saved.");
      }

      setMessage("");
      setEmail("");
      setFeedback({
        tone: "success",
        title: "Feedback saved",
        message: "Thanks - that feedback has been recorded.",
      });
      trackClientEvent("feedback_submitted", {
        hasEmail: Boolean(parsed.data.email),
      });
    } catch (error) {
      setFeedback({
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
    <form className="feedback-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <label className="waitlist-label" htmlFor="feedback-message">
        What would you want this tool to handle?
      </label>
      <textarea
        className="feedback-textarea"
        id="feedback-message"
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Example: reusable assessment packs, LMS-specific validation notes, or faster scenario duplication."
        rows={4}
        value={message}
      />
      <label className="waitlist-label" htmlFor="feedback-email">
        Email address (optional)
      </label>
      <input
        autoComplete="email"
        className="waitlist-input"
        id="feedback-email"
        inputMode="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="name@company.com"
        type="email"
        value={email}
      />
      <button className="primary-button feedback-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending..." : "Send feedback"}
      </button>
      <p className="waitlist-note">
        Short and optional. This is only for beta feedback collection.
      </p>
      {feedback ? (
        <div className={`feedback-banner feedback-${feedback.tone}`}>
          <strong>{feedback.title}</strong>
          <span>{feedback.message}</span>
        </div>
      ) : null}
    </form>
  );
}
