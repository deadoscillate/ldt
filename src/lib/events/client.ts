"use client";

import {
  buildClientEventPayload,
  type ClientEventMetadata,
  type ClientTelemetryIdentity,
} from "@/lib/events/payload";

export type { ClientEventMetadata } from "@/lib/events/payload";

const CLIENT_ID_STORAGE_KEY = "ldt:telemetry:client-id";
const SESSION_ID_STORAGE_KEY = "ldt:telemetry:session-id";

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateStoredId(storage: Storage, key: string, prefix: string): string {
  const existingValue = storage.getItem(key);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = generateId(prefix);

  storage.setItem(key, nextValue);
  return nextValue;
}

export function getClientTelemetryIdentity(): ClientTelemetryIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return {
      clientId: getOrCreateStoredId(window.localStorage, CLIENT_ID_STORAGE_KEY, "client"),
      sessionId: getOrCreateStoredId(
        window.sessionStorage,
        SESSION_ID_STORAGE_KEY,
        "session"
      ),
    };
  } catch {
    return null;
  }
}

export function trackClientEvent(
  eventName: string,
  metadata: ClientEventMetadata = {},
  source = "landing-page"
): void {
  if (typeof window === "undefined") {
    return;
  }

  const identity = getClientTelemetryIdentity();
  const payload = JSON.stringify(
    buildClientEventPayload({
      eventName,
      metadata,
      source,
      environment: {
        clientId: identity?.clientId ?? "client-anonymous",
        sessionId: identity?.sessionId ?? "session-anonymous",
        pagePath: window.location.pathname,
      },
    })
  );

  // Prefer sendBeacon so CTA clicks and form submissions still record when navigation starts immediately.
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const requestBody = new Blob([payload], {
      type: "application/json",
    });

    navigator.sendBeacon("/api/events", requestBody);
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
    return;
  });
}
