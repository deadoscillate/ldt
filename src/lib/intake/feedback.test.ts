import test from "node:test";
import assert from "node:assert/strict";

import { serializeIntakeEntries } from "@/lib/intake/export";
import { buildFrictionSignals } from "@/lib/intake/telemetry";
import { createEventEntry, createFeedbackEntry } from "@/lib/intake/store";
import { buildStudioFeedbackContext } from "@/lib/studio/feedback";

test("feedback entries preserve actionable metadata and default to new status", () => {
  const context = buildStudioFeedbackContext({
    currentScreen: "preview",
    pagePath: "/studio",
    projectId: "security-awareness",
    templateId: "phishing-awareness",
    variantId: "healthcare",
    themeId: "corporate-blue",
  });
  const entry = createFeedbackEntry({
    feedbackType: "bug",
    message: "Export summary hid the package contents after a failed build.",
    source: "studio",
    sourcePage: "/studio",
    context,
    screenshot: {
      dataUrl: "data:image/png;base64,abc123",
      fileName: "studio.png",
      mimeType: "image/png",
    },
  });

  assert.equal(entry.feedbackType, "bug");
  assert.equal(entry.status, "new");
  assert.equal(entry.context?.currentScreen, "preview");
  assert.equal(entry.screenshot?.fileName, "studio.png");
});

test("feedback CSV export includes context and screenshot visibility", () => {
  const entry = createFeedbackEntry({
    feedbackType: "confusion",
    message: "I expected Builder mode to explain why validation failed.",
    source: "studio",
    sourcePage: "/studio",
    context: buildStudioFeedbackContext({
      currentScreen: "builder",
      pagePath: "/studio",
      projectId: "customer-service",
      templateId: "customer-service-escalation",
      variantId: "retail-support",
      themeId: "default",
    }),
    screenshot: {
      dataUrl: "data:image/png;base64,def456",
      fileName: "builder.png",
      mimeType: "image/png",
    },
  });
  const csv = serializeIntakeEntries("feedback", "csv", [entry]);

  assert.match(csv, /feedbackType,status,message,email,sourcePage,currentScreen/);
  assert.match(csv, /confusion,new/);
  assert.match(csv, /builder/);
  assert.match(csv, /yes/);
});

test("friction signals summarize repeated validation issues and preview drop-off", () => {
  const entries = [
    createEventEntry({
      eventName: "onboarding_started",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
    createEventEntry({
      eventName: "preview_opened",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
    createEventEntry({
      eventName: "template_selected",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
    createEventEntry({
      eventName: "template_selected",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
    createEventEntry({
      eventName: "template_selected",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
    createEventEntry({
      eventName: "validation_issues_detected",
      source: "studio",
      metadata: {
        sessionId: "session-a",
        issueCount: 3,
      },
    }),
    createEventEntry({
      eventName: "validation_issues_detected",
      source: "studio",
      metadata: {
        sessionId: "session-a",
        issueCount: 2,
      },
    }),
    createEventEntry({
      eventName: "export_failed",
      source: "studio",
      metadata: {
        sessionId: "session-a",
      },
    }),
  ];
  const signals = buildFrictionSignals(entries);

  assert.equal(
    signals.find((signal) => signal.id === "abandoned-onboarding")?.count,
    1
  );
  assert.equal(
    signals.find((signal) => signal.id === "preview-without-export")?.count,
    1
  );
  assert.equal(
    signals.find((signal) => signal.id === "repeated-validation-errors")?.count,
    1
  );
  assert.equal(
    signals.find((signal) => signal.id === "export-failures")?.count,
    1
  );
  assert.equal(
    signals.find((signal) => signal.id === "repeated-template-switching")?.count,
    1
  );
});
