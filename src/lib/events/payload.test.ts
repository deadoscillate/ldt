import test from "node:test";
import assert from "node:assert/strict";

import { APP_VERSION } from "@/lib/app/version";
import { buildClientEventPayload } from "@/lib/events/payload";

test("event payloads include page path, app version, and anonymous identity", () => {
  const payload = buildClientEventPayload({
    eventName: "preview_opened",
    source: "studio",
    metadata: {
      currentScreen: "preview",
      templateId: "phishing-awareness",
    },
    environment: {
      clientId: "client-123",
      sessionId: "session-456",
      pagePath: "/studio",
    },
  });

  assert.equal(payload.eventName, "preview_opened");
  assert.equal(payload.source, "studio");
  assert.equal(payload.metadata.clientId, "client-123");
  assert.equal(payload.metadata.sessionId, "session-456");
  assert.equal(payload.metadata.pagePath, "/studio");
  assert.equal(payload.metadata.appVersion, APP_VERSION);
  assert.equal(payload.metadata.templateId, "phishing-awareness");
});
