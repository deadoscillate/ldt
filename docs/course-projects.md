# Course Projects

Course projects make structured authoring behave like a small software project.

The starter repository already ships with three example projects under `course-projects/`:

- `security-awareness`
- `workplace-conduct`
- `customer-service`

The source of truth is the project source:

- `project.yaml`
- template YAML
- variable-set YAML
- theme pack files
- project assets and README files

SCORM packages are generated build artifacts.

## Project structure

Example:

```text
/course-projects
  /security-awareness
    project.yaml
    README.md
    .gitignore
    /templates
      /phishing-awareness
        template.yaml
        schema.yaml
        README.md
    /variants
      k12-district.yaml
      healthcare.yaml
    /themes
      /default
        theme.yaml
        tokens.yaml
        /assets
    /assets
    /build
```

## What `project.yaml` does

`project.yaml` declares:

- project metadata
- default template, variant, and theme
- supported build targets
- where template files live
- where variable sets live
- where theme packs live

This keeps the project composition explicit instead of hidden in studio state.

## Studio workflow

In the studio, project mode follows this sequence:

1. Choose a source project.
2. Choose a template inside the project.
3. Choose or duplicate a variable set.
4. Choose a theme pack.
5. Compile the preview from the canonical model.
6. Export a SCORM build or export the full project source archive.

## Source vs build

Keep this distinction strict:

- source project = editable YAML, theme files, assets, and metadata
- compiled preview = generated runtime representation used for browser testing
- exported build = SCORM zip plus build manifest

Do not edit generated SCORM packages and treat them as build output only.

## Import and export

The studio supports:

- exporting a project source archive as a zip
- importing a project source archive back into the studio

Project archives include:

- `project.yaml`
- project README and `.gitignore`
- template source files
- variable-set files
- theme metadata and token files
- bundled theme assets

## Git guidance

Recommended approach:

- commit project source files
- ignore generated build outputs in `/build`
- keep variable sets separate from template structure
- keep theme packs separate from course logic
- review branching changes as text diffs before exporting new builds

## Reproducible builds

Project-mode SCORM exports now carry project-aware metadata:

- project id and version
- template id
- variant id
- theme id
- build timestamp
- build fingerprint
- build manifest

This makes the source-to-build path inspectable and auditable.

## Using course projects in a build pipeline

Course projects can now be validated and built from the command line.

Examples:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts compile --project course-projects/security-awareness --target phishing-awareness/healthcare/corporate-blue
tsx scripts/course-project-build.ts export --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts export-all --project course-projects/security-awareness --mode validation
tsx scripts/course-project-build.ts manifest --project course-projects/security-awareness --target phishing-awareness/enterprise/corporate-blue
tsx scripts/course-project-build.ts clean --project course-projects/security-awareness
```

Outputs are deterministic and land under the project build directory by default:

- `build/preview/*.course.json`
- `build/scorm12/*.zip`
- `build/scorm12/*.build-manifest.json`
- `build/build-manifest.json`
- `build/ci-build-report.json`
- `build/build-summary.md`

Warnings stay non-fatal unless you pass `--fail-on-warning`.
