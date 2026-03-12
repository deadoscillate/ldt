"use client";

import { useRef, type ChangeEvent, type UIEvent } from "react";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function YamlEditor({
  value,
  onChange,
  placeholder,
}: YamlEditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = value.split(/\r\n|\r|\n/).length;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onChange(event.target.value);
  }

  function handleScroll(event: UIEvent<HTMLTextAreaElement>): void {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <span className="editor-file">course.yaml</span>
        <span className="editor-language">YAML</span>
      </div>
      <div className="editor-surface">
        <div aria-hidden="true" className="editor-gutter" ref={gutterRef}>
          {Array.from({ length: lineCount }, (_, index) => (
            <span className="editor-line-number" key={index + 1}>
              {index + 1}
            </span>
          ))}
        </div>
        {/* Keep a native textarea so paste, selection, and keyboard behavior stay predictable for testers. */}
        <textarea
          className="yaml-editor"
          onChange={handleChange}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          value={value}
          wrap="off"
        />
      </div>
    </div>
  );
}
