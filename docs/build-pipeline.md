# Using Course Projects in a Build Pipeline

Sapio Forge course projects are intended to behave like source-controlled build inputs.

## Philosophy

- source files are the system of record
- preview is compiled from validated source
- SCORM packages are generated build artifacts
- build reports and manifests make runs inspectable

This keeps learning modules closer to software build workflows than to manual slide export workflows.

## CLI commands

Examples:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
tsx scripts/course-project-build.ts test --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts test --all-projects
tsx scripts/course-project-build.ts compile --project course-projects/security-awareness --template phishing-awareness --variant k12-district --theme default
tsx scripts/course-project-build.ts export --project course-projects/security-awareness --template phishing-awareness --variant k12-district --theme default
tsx scripts/course-project-build.ts export-all --project course-projects/security-awareness --mode validation
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --run-tests
tsx scripts/course-project-build.ts manifest --project course-projects/security-awareness --template phishing-awareness --variant healthcare --theme corporate-blue
tsx scripts/course-project-build.ts clean --project course-projects/security-awareness
```

Supported flags:

- `--project <path>`
- `--output <path>`
- `--json-report <path>`
- `--mode standard|validation`
- `--target <template>/<variant>/<theme>`
- `--template <id>`
- `--variant <id>`
- `--theme <id>`
- `--module <id>`
- `--changed <path>`
- `--all`
- `--fail-on-warning`

## Pipeline stages

Each run reports these stages:

1. load project
2. validate project structure
3. validate source schema
4. resolve templates, variables, theme, and shared modules
5. normalize into canonical model
6. validate graph and references
7. generate preview/runtime-ready model
8. run declarative learner-path tests when requested
9. package SCORM build
10. generate build manifest

## Output files

Default output layout:

```text
/build
  /preview
    <template>__<variant>__<theme>.course.json
  /scorm12
    <template>__<variant>__<theme>__scorm12.zip
    <template>__<variant>__<theme>.build-manifest.json
  dependency-graph.json
  build-manifest.json
  ci-build-report.json
  build-summary.md
  /tests
    course-test-report.json
    course-test-summary.md
```

## Warning vs error behavior

Errors fail the run.

Warnings do not fail the run unless `--fail-on-warning` is set.

Current warning examples:

- missing project `.gitignore`
- missing build README
- unused project asset files
- unpinned shared module version usage
- deprecated shared module usage

## Why this helps in Git workflows

This automation makes it easy to:

- validate source on every change
- regression-test branching and scoring logic before export
- rebuild SCORM packages consistently
- inspect build manifests, fingerprints, and dependency graphs
- keep exported artifacts separate from source files
- prepare for future CI systems without changing the source model

## GitHub Actions workflow templates

The repo now includes GitHub-ready workflow templates under `.github/workflows/`:

- `validate-course-project.yml`
- `build-course-project.yml`
- `build-course-family.yml`

These workflows call the same CLI commands described above. They install dependencies with `npm ci`, run validation or build commands against the checked-in course projects, upload generated SCORM zips and manifest files as artifacts, and append `build-summary.md` to the GitHub job summary for review.

For the workflow details and customization notes, see [github-actions.md](github-actions.md).
