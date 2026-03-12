"use client";

import type { TemplateScalarValue } from "@/lib/course/schema";
import type { TemplateFieldDefinition } from "@/lib/course/template";

interface TemplateDataEditorProps {
  fields: TemplateFieldDefinition[];
  values: Record<string, TemplateScalarValue>;
  onChange: (key: string, value: TemplateScalarValue) => void;
}

export function TemplateDataEditor({
  fields,
  values,
  onChange,
}: TemplateDataEditorProps) {
  if (fields.length === 0) {
    return (
      <div className="template-data-empty">
        <p className="panel-copy">
          Add root-level <code>templateData</code> values to expose quick-edit
          placeholders in the studio.
        </p>
      </div>
    );
  }

  return (
    <div className="template-data-grid">
      {/* Keep template data as a small form so authors can adjust repeated copy without hiding the underlying YAML source. */}
      {fields.map((field) => {
        const currentValue = values[field.key] ?? field.value;

        if (field.inputType === "boolean") {
          return (
            <label className="template-field" key={field.key}>
              <span className="template-field-label">{field.key}</span>
              <select
                className="template-field-input"
                onChange={(event) => onChange(field.key, event.target.value === "true")}
                value={String(
                  currentValue === true || currentValue === "true"
                )}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          );
        }

        return (
          <label className="template-field" key={field.key}>
            <span className="template-field-label">{field.key}</span>
            <input
              className="template-field-input"
              onChange={(event) => onChange(field.key, event.target.value)}
              type={field.inputType === "number" ? "number" : "text"}
              value={String(currentValue)}
            />
          </label>
        );
      })}
    </div>
  );
}
