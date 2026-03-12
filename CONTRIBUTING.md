# Contributing

This repository is intended to behave like a source-controlled learning infrastructure template.

## Before you change anything

Understand the boundary:

- source files are the system of record
- SCORM packages are generated build artifacts
- templates, variants, and theme packs should stay separate

## Adding a new course project

1. Create a new folder under `course-projects/`.
2. Add:
   - `project.yaml`
   - `README.md`
   - `.gitignore`
   - `templates/`
   - `variants/`
   - `themes/`
   - `assets/`
   - `build/README.md`
3. Validate the project locally before committing.

Recommended command:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/<project-id> --all
```

## Adding a new template pack

1. Create a folder under `template-packs/`.
2. Add `pack.yaml`, `README.md`, and variant YAML files.
3. Reference shared template and schema files explicitly.
4. Keep pack metadata clear and Git-friendly.

## Adding a new theme pack

1. Create a folder under `themes/`.
2. Add `theme.yaml`, `tokens.yaml`, `assets/`, and `README.md`.
3. Keep themes visual-only. Do not move structure or branching rules into theme files.

## Validate before committing

Recommended checks:

```bash
npm run validate:project
npm run test
npm run build
```

If you are changing a non-default project, run the CLI against that project directly.

## Source vs build outputs

Commit:

- YAML source
- project metadata
- theme token files
- assets
- docs

Do not commit:

- generated SCORM zips
- generated CI build reports
- generated preview/build artifacts under project `build/` directories

## Review guidance

When reviewing changes:

- review branching and references as text diffs
- review variant changes separately from template changes
- review theme changes separately from course logic
- verify generated artifacts can be reproduced locally instead of editing them directly
