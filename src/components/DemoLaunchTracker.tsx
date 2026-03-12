"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/events/client";

export function DemoLaunchTracker() {
  useEffect(() => {
    trackClientEvent("demo_launched", {
      placement: "landing-preview",
    });
  }, []);

  return null;
}
