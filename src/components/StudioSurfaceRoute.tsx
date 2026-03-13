interface StudioSurfaceRouteProps {
  surface: "setup" | "edit" | "preview" | "export" | "advanced";
  title: string;
  description: string;
}

export function StudioSurfaceRoute({
  surface,
  title,
  description,
}: StudioSurfaceRouteProps) {
  return (
    <section
      aria-label={`${title} surface`}
      className="studio-route-slot sr-only"
      data-studio-surface={surface}
    >
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
