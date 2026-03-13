import type { Metadata } from "next";

import {
  getAdminTokenFromSearchParam,
  isAdminAccessAvailable,
  isAdminTokenValid,
} from "@/lib/intake/admin-auth";
import type { FeedbackEntry } from "@/lib/intake/store";
import { listIntakeEntries } from "@/lib/intake/store";

export const metadata: Metadata = {
  title: "Sapio Forge Beta Feedback Review",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminFeedbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildExportHref(format: "json" | "csv", token: string | null): string {
  const params = new URLSearchParams({
    kind: "feedback",
    format,
  });

  if (token) {
    params.set("token", token);
  }

  return `/api/admin/intake?${params.toString()}`;
}

export default async function AdminFeedbackPage({
  searchParams,
}: AdminFeedbackPageProps) {
  const params = await searchParams;
  const token = getAdminTokenFromSearchParam(params.token);

  if (!isAdminAccessAvailable()) {
    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-empty-state">
          <p className="eyebrow">Feedback Review</p>
          <h1>Admin export is not configured.</h1>
          <p className="panel-copy">
            Set <code>ADMIN_EXPORT_TOKEN</code> before exposing internal beta review
            routes in production.
          </p>
        </section>
      </main>
    );
  }

  if (!isAdminTokenValid(token)) {
    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-empty-state">
          <p className="eyebrow">Feedback Review</p>
          <h1>Unauthorized</h1>
          <p className="panel-copy">
            Open this page with <code>?token=YOUR_ADMIN_EXPORT_TOKEN</code>.
          </p>
        </section>
      </main>
    );
  }

  const feedbackResult = await listIntakeEntries<FeedbackEntry>("feedback");

  return (
    <main className="page-shell admin-shell">
      <section className="panel admin-header-panel">
        <div>
          <p className="eyebrow">Feedback Review</p>
          <h1>Studio beta reports</h1>
          <p className="panel-copy">
            Review context-aware beta feedback with screenshots, current screen metadata,
            and exportable raw records.
          </p>
        </div>
        <div className="button-row admin-export-row">
          <a className="ghost-button button-link" href={buildExportHref("csv", token)}>
            Export CSV
          </a>
          <a className="ghost-button button-link" href={buildExportHref("json", token)}>
            Export JSON
          </a>
        </div>
      </section>

      <section className="panel admin-card">
        <div className="admin-feedback-list">
          {feedbackResult.entries.map((entry) => (
            <article className="admin-feedback-item" key={entry.id}>
              <div className="admin-feedback-meta">
                <span>{entry.feedbackType}</span>
                <span>{entry.status}</span>
                <span>{formatTimestamp(entry.submittedAt)}</span>
                <span>{entry.email ?? "anonymous"}</span>
                <span>{entry.context?.currentScreen ?? entry.source}</span>
              </div>
              <div className="admin-feedback-tags">
                {entry.context?.projectId ? (
                  <span className="validation-chip">{entry.context.projectId}</span>
                ) : null}
                {entry.context?.templateId ? (
                  <span className="validation-chip">{entry.context.templateId}</span>
                ) : null}
                {entry.context?.variantId ? (
                  <span className="validation-chip">{entry.context.variantId}</span>
                ) : null}
                {entry.context?.themeId ? (
                  <span className="validation-chip">{entry.context.themeId}</span>
                ) : null}
                {entry.screenshot ? (
                  <span className="validation-chip">screenshot attached</span>
                ) : null}
              </div>
              <p>{entry.message}</p>
              <p className="panel-copy">
                {entry.sourcePage ?? "/studio"} | {entry.context?.appVersion ?? "unknown"}
              </p>
              {entry.screenshot ? (
                <img
                  alt={`Feedback attachment for ${entry.id}`}
                  className="admin-feedback-image"
                  src={entry.screenshot.dataUrl}
                />
              ) : null}
            </article>
          ))}
        </div>

        {feedbackResult.entries.length === 0 ? (
          <p className="panel-copy admin-empty-copy">No beta feedback has been submitted yet.</p>
        ) : null}
      </section>
    </main>
  );
}
