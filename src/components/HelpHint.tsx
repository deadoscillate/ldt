"use client";

interface HelpHintProps {
  label: string;
  description: string;
}

export function HelpHint({ label, description }: HelpHintProps) {
  return (
    <details className="help-hint">
      <summary>{label}</summary>
      <div className="help-hint-popover">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
    </details>
  );
}
