"use client";

import { useState, type FormEvent } from "react";

import { waitlistRequestSchema } from "@/lib/waitlist/schema";

interface WaitlistFeedback {
  tone: "success" | "error";
  title: string;
  message: string;
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<WaitlistFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = waitlistRequestSchema.safeParse({
      email,
      source: "landing-page",
    });

    if (!parsed.success) {
      setFeedback({
        tone: "error",
        title: "Email required",
        message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The waitlist request could not be saved.");
      }

      setEmail("");
      setFeedback({
        tone: "success",
        title: "Request received",
        message:
          payload.message ??
          "You have been added to the early access list for the SCORM engine MVP.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Request failed",
        message:
          error instanceof Error
            ? error.message
            : "The waitlist request could not be submitted.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="waitlist-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <label className="waitlist-label" htmlFor="waitlist-email">
        Email address
      </label>
      <div className="waitlist-input-row">
        <input
          autoComplete="email"
          className="waitlist-input"
          id="waitlist-email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          type="email"
          value={email}
        />
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Request Early Access"}
        </button>
      </div>
      <p className="waitlist-note">
        One field only. No account, login, or LMS setup required.
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
