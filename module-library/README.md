# Shared Module Library

This directory contains reusable source modules that can be included in multiple
course templates and course-family projects.

- `registry.yaml` is the indexed catalog used by validation, dependency graphs,
  and affected rebuild detection.
- `modules/*.yaml` are the editable source files.
- Modules are compile-time source assets. They are expanded into validated course
  source before preview or SCORM packaging.
