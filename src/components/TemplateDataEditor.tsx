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
              <span className="template-field-label">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.description ? (
                <span className="template-field-description">{field.description}</span>
              ) : null}
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
            <span className="template-field-label">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.description ? (
              <span className="template-field-description">{field.description}</span>
            ) : null}
            <input
              className={`template-field-input template-field-input-${field.inputType}`}
              onChange={(event) =>
                onChange(
                  field.key,
                  field.inputType === "number"
                    ? event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                    : event.target.value
                )
              }
              placeholder={field.placeholder}
              type={
                field.inputType === "number" ||
                field.inputType === "email" ||
                field.inputType === "url" ||
                field.inputType === "color"
                  ? field.inputType
                  : "text"
              }
              value={
                field.inputType === "color"
                  ? String(currentValue || field.placeholder || "#1f6feb")
                  : String(currentValue)
              }
            />
          </label>
        );
      })}
    </div>
  );
}
