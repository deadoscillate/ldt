import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio | Preview",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="preview"
      title="Studio preview"
      description="Preview the learner experience inside the same Studio shell before export."
    />
  );
}
