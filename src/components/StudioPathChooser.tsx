"use client";

import { BRAND } from "@/lib/app/brand";
import type { StudioPathDefinition, StudioStartingPath } from "@/lib/studio/onboarding";

interface StudioPathChooserProps {
  open: boolean;
  paths: readonly StudioPathDefinition[];
  onChoosePath: (pathId: StudioStartingPath) => void;
  onDismiss: () => void;
}

export function StudioPathChooser({
  open,
  paths,
  onChoosePath,
  onDismiss,
}: StudioPathChooserProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="walkthrough-layer" role="dialog" aria-modal="true">
      <button
        aria-label="Dismiss studio onboarding"
        className="walkthrough-backdrop"
        onClick={onDismiss}
        type="button"
      />
      <div className="studio-path-chooser">
        <p className="eyebrow">First-run onboarding</p>
        <h2>Welcome to {BRAND.studioName}</h2>
        <p className="panel-copy">
          Pick the easiest starting point for how you like to work. Builder view
          uses guided fields. Source view lets you work directly in YAML and project
          files.
        </p>
        <div className="studio-path-grid">
          {paths.map((path) => (
            <article className="studio-path-card" key={path.id}>
              <span className="template-pill">{path.label}</span>
              <strong>{path.title}</strong>
              <p>{path.description}</p>
              <p className="studio-path-emphasis">{path.emphasis}</p>
              <button
                className="primary-button"
                onClick={() => onChoosePath(path.id)}
                type="button"
              >
                {path.actionLabel}
              </button>
            </article>
          ))}
        </div>
        <div className="button-row">
          <button className="ghost-button" onClick={onDismiss} type="button">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
