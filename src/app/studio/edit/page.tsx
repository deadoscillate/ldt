import type { Metadata } from "next";

import { StudioSurfaceRoute } from "@/components/StudioSurfaceRoute";

export const metadata: Metadata = {
  title: "Studio | Edit",
};

export default function StudioPage() {
  return (
    <StudioSurfaceRoute
      surface="edit"
      title="Studio editing"
      description="Edit the course in Guided Editor first, with Source Editor still available when needed."
    />
  );
}
