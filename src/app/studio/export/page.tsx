import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio | Export",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="export"
      title="Studio export"
      description="Build SCORM and review validation inside the same Studio shell."
    />
  );
}
