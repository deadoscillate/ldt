# Build Artifacts

This repository keeps a strict separation between editable source and generated outputs.

## Source of truth

Editable source includes:

- `project.yaml`
- template YAML
- variant YAML
- theme metadata and token files
- assets
- docs and manifests

## Generated outputs

Generated outputs include:

- compiled preview models
- SCORM zip packages
- per-build manifests
- aggregate build manifests
- JSON build reports
- markdown build summaries
- logic test reports

## Default project output layout

```text
course-projects/<project-id>/build
  /preview
    <template>__<variant>__<theme>.course.json
  /scorm12
    <template>__<variant>__<theme>__scorm12.zip
    <template>__<variant>__<theme>.build-manifest.json
  build-manifest.json
  ci-build-report.json
  build-summary.md
  /tests
    course-test-report.json
    course-test-summary.md
```

## Root build directory

The repo also reserves `/build` for root-level generated application artifacts such as the local Next.js production build cache.

## Git guidance

Commit source. Ignore generated build outputs.

Project directories already include `.gitignore` files for their own `build/` folders, and the repo root ignores generated root build files as well.
