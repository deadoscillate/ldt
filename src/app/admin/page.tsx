import type { Metadata } from "next";

import {
  getAdminTokenFromSearchParam,
  isAdminAccessAvailable,
  isAdminTokenValid,
} from "@/lib/intake/admin-auth";
import type { EventEntry, FeedbackEntry, WaitlistEntry } from "@/lib/intake/store";
import { listIntakeEntries } from "@/lib/intake/store";

export const metadata: Metadata = {
  title: "Beta Intake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminPageProps {
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

function buildExportHref(
  kind: "waitlist" | "feedback" | "events",
  format: "json" | "csv",
  token: string | null
): string {
  const params = new URLSearchParams({
    kind,
    format,
  });

  if (token) {
    params.set("token", token);
  }

  return `/api/admin/intake?${params.toString()}`;
}

function buildEventCounts(entries: EventEntry[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.eventName, (counts.get(entry.eventName) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function buildOnboardingSummary(entries: EventEntry[]): Array<{ label: string; count: number }> {
  const trackedEventNames = [
    "onboarding_started",
    "onboarding_completed",
    "first_preview_opened",
    "first_export_completed",
    "starter_repo_downloaded",
  ];

  return trackedEventNames.map((eventName) => ({
    label: eventName,
    count: entries.filter((entry) => entry.eventName === eventName).length,
  }));
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const token = getAdminTokenFromSearchParam(params.token);

  if (!isAdminAccessAvailable()) {
    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-empty-state">
          <p className="eyebrow">Admin</p>
          <h1>Admin export is not configured.</h1>
          <p className="panel-copy">
            Set <code>ADMIN_EXPORT_TOKEN</code> before exposing the beta intake admin in
            production.
          </p>
        </section>
      </main>
    );
  }

  if (!isAdminTokenValid(token)) {
    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-empty-state">
          <p className="eyebrow">Admin</p>
          <h1>Unauthorized</h1>
          <p className="panel-copy">
            Open this page with <code>?token=YOUR_ADMIN_EXPORT_TOKEN</code>.
          </p>
        </section>
      </main>
    );
  }

  try {
    const [waitlistResult, feedbackResult, eventsResult] = await Promise.all([
      listIntakeEntries<WaitlistEntry>("waitlist"),
      listIntakeEntries<FeedbackEntry>("feedback"),
      listIntakeEntries<EventEntry>("events"),
    ]);
    const eventCounts = buildEventCounts(eventsResult.entries);
    const onboardingSummary = buildOnboardingSummary(eventsResult.entries);

    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-header-panel">
          <div>
            <p className="eyebrow">Internal Admin</p>
            <h1>Beta funnel intake</h1>
            <p className="panel-copy">
              Review waitlist submissions, feedback notes, and lightweight funnel events.
            </p>
          </div>
          <div className="admin-summary-grid">
            <article className="summary-card">
              <strong>Waitlist</strong>
              <span>{waitlistResult.entries.length} captured leads</span>
            </article>
            <article className="summary-card">
              <strong>Feedback</strong>
              <span>{feedbackResult.entries.length} responses collected</span>
            </article>
            <article className="summary-card">
              <strong>Events</strong>
              <span>{eventsResult.entries.length} tracked actions</span>
            </article>
          </div>
        </section>

        <section className="admin-grid">
          <article className="panel admin-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Waitlist</p>
                <h2>Lead capture</h2>
                <p className="panel-copy">
                  Backend: <code>{waitlistResult.backend}</code>
                </p>
              </div>
              <div className="button-row admin-export-row">
                <a className="ghost-button button-link" href={buildExportHref("waitlist", "csv", token)}>
                  Export CSV
                </a>
                <a className="ghost-button button-link" href={buildExportHref("waitlist", "json", token)}>
                  Export JSON
                </a>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Lead type</th>
                    <th>Notes</th>
                    <th>Referrer</th>
                    <th>Source</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistResult.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.email}</td>
                      <td>{entry.leadType}</td>
                      <td>{entry.notes ?? "-"}</td>
                      <td>{entry.referrer ?? "-"}</td>
                      <td>{entry.source}</td>
                      <td>{formatTimestamp(entry.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {waitlistResult.entries.length === 0 ? (
              <p className="panel-copy admin-empty-copy">No waitlist entries captured yet.</p>
            ) : null}
          </article>

          <article className="panel admin-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Feedback</p>
                <h2>Qualitative notes</h2>
                <p className="panel-copy">
                  Backend: <code>{feedbackResult.backend}</code>
                </p>
              </div>
              <div className="button-row admin-export-row">
                <a className="ghost-button button-link" href={buildExportHref("feedback", "csv", token)}>
                  Export CSV
                </a>
                <a className="ghost-button button-link" href={buildExportHref("feedback", "json", token)}>
                  Export JSON
                </a>
              </div>
            </div>

            <div className="admin-feedback-list">
              {feedbackResult.entries.map((entry) => (
                <article className="admin-feedback-item" key={entry.id}>
                  <div className="admin-feedback-meta">
                    <span>{formatTimestamp(entry.submittedAt)}</span>
                    <span>{entry.email ?? "anonymous"}</span>
                    <span>{entry.sourcePage ?? entry.source}</span>
                  </div>
                  <p>{entry.message}</p>
                </article>
              ))}
            </div>

            {feedbackResult.entries.length === 0 ? (
              <p className="panel-copy admin-empty-copy">No feedback responses captured yet.</p>
            ) : null}
          </article>
        </section>

        <section className="admin-grid">
          <article className="panel admin-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Onboarding funnel</p>
                <h2>First-run summary</h2>
                <p className="panel-copy">
                  Lightweight visibility into how many external users start onboarding,
                  reach preview, and complete a first export.
                </p>
              </div>
            </div>

            <div className="admin-event-grid">
              {onboardingSummary.map((entry) => (
                <article className="summary-card" key={entry.label}>
                  <strong>{entry.label}</strong>
                  <span>{entry.count} events</span>
                </article>
              ))}
            </div>
          </article>

          <article className="panel admin-card">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Events</p>
                <h2>Key funnel counts</h2>
                <p className="panel-copy">
                  Backend: <code>{eventsResult.backend}</code>
                </p>
              </div>
              <div className="button-row admin-export-row">
                <a className="ghost-button button-link" href={buildExportHref("events", "csv", token)}>
                  Export CSV
                </a>
                <a className="ghost-button button-link" href={buildExportHref("events", "json", token)}>
                  Export JSON
                </a>
              </div>
            </div>

            <div className="admin-event-grid">
              {eventCounts.map((eventCount) => (
                <article className="summary-card" key={eventCount.label}>
                  <strong>{eventCount.label}</strong>
                  <span>{eventCount.count} events</span>
                </article>
              ))}
            </div>

            {eventCounts.length === 0 ? (
              <p className="panel-copy admin-empty-copy">No tracked events captured yet.</p>
            ) : null}
          </article>

          <article className="panel admin-card">
            <p className="eyebrow">Recent Events</p>
            <h2>Latest activity</h2>
            <div className="admin-event-list">
              {eventsResult.entries.slice(0, 12).map((entry) => (
                <article className="admin-event-item" key={entry.id}>
                  <div className="admin-feedback-meta">
                    <span>{entry.eventName}</span>
                    <span>{entry.source}</span>
                    <span>{formatTimestamp(entry.submittedAt)}</span>
                  </div>
                  <code>{JSON.stringify(entry.metadata)}</code>
                </article>
              ))}
            </div>

            {eventsResult.entries.length === 0 ? (
              <p className="panel-copy admin-empty-copy">No recent events captured yet.</p>
            ) : null}
          </article>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="page-shell admin-shell">
        <section className="panel admin-empty-state">
          <p className="eyebrow">Admin</p>
          <h1>Intake data could not be loaded.</h1>
          <p className="panel-copy">
            {error instanceof Error ? error.message : "Unexpected admin page failure."}
          </p>
        </section>
      </main>
    );
  }
}
