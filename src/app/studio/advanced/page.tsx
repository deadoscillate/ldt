import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio | Advanced",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="advanced"
      title="Studio advanced tools"
      description="Open project details, tests, modules, and advanced source tools inside the Studio shell."
    />
  );
}
