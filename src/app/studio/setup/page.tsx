import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio | Setup",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="setup"
      title="Studio setup"
      description="Choose the project, template, saved version, and theme inside the main Studio shell."
    />
  );
}
