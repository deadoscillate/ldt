"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/events/client";

export function LandingViewTracker() {
  useEffect(() => {
    trackClientEvent(
      "landing_page_viewed",
      {
        path: window.location.pathname,
      },
      "landing-page"
    );
  }, []);

  return null;
}
