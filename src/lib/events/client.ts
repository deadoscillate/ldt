"use client";

export interface ClientEventMetadata {
  [key: string]: string | number | boolean | null;
}

export function trackClientEvent(
  eventName: string,
  metadata: ClientEventMetadata = {},
  source = "landing-page"
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify({
    eventName,
    metadata,
    source,
  });

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
