import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="setup"
      title="Studio setup"
      description="Start in guided setup inside the mounted Sapio Forge Studio shell."
    />
  );
}
