"use client";

import { useState, type FormEvent } from "react";

import { trackClientEvent } from "@/lib/events/client";
import { waitlistRequestSchema, type LeadType } from "@/lib/intake/schema";

interface WaitlistFeedback {
  tone: "success" | "error";
  title: string;
  message: string;
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("unknown");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<WaitlistFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = waitlistRequestSchema.safeParse({
      email,
      leadType,
      notes,
      referrer: typeof document !== "undefined" ? document.referrer : "",
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
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "The waitlist request could not be saved.");
      }

      setEmail("");
      setLeadType("unknown");
      setNotes("");
      setFeedback({
        tone: "success",
        title: "Submitted",
        message: "You're on the early access list.",
      });
      trackClientEvent("waitlist_submitted", {
        leadType: parsed.data.leadType ?? "unknown",
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
      <div className="waitlist-form-grid">
        <div>
          <label className="waitlist-label" htmlFor="waitlist-lead-type">
            I&apos;m closest to
          </label>
          <select
            className="waitlist-select"
            id="waitlist-lead-type"
            onChange={(event) => setLeadType(event.target.value as LeadType)}
            value={leadType}
          >
            <option value="instructional-designer">Instructional designer</option>
            <option value="consultant">Consultant</option>
            <option value="technical-ld">Technical L&amp;D</option>
            <option value="unknown">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="waitlist-label" htmlFor="waitlist-notes">
            Notes (optional)
          </label>
          <textarea
            className="feedback-textarea waitlist-notes-textarea"
            id="waitlist-notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything useful to know about your LMS, team, or use case?"
            rows={3}
            value={notes}
          />
        </div>
      </div>
      <p className="waitlist-note">
        No login required. No LMS setup required. Early feedback welcome.
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
