# Using GitHub Actions with Course Projects

Sapio Forge includes GitHub Actions workflow templates so course projects can be validated and built directly from source-controlled repositories.

## Included workflows

Workflow files live under `.github/workflows/`:

- `validate-course-project.yml`
- `build-course-project.yml`
- `build-course-family.yml`

## What each workflow does

### `validate-course-project.yml`

- runs on `pull_request` and `push`
- installs dependencies with `npm ci`
- finds every `course-projects/*/project.yaml`
- runs `validate --all` for each project
- runs `test` for each project after validation
- uploads `ci-build-report.json`, `build-manifest.json`, `dependency-graph.json`, `build-summary.md`, and course test reports

Use this workflow to catch project-structure, schema, graph, and learner-logic regressions before merge.

### `build-course-project.yml`

- runs on `workflow_dispatch`
- optionally runs on `push` to `main`
- builds one selected target when triggered manually
- runs logic tests for the selected target before export
- builds the default target for each project on `main`
- switches to an affected rebuild when shared modules under `module-library/` change on `main`
- uploads generated SCORM zips, per-build manifests, aggregate manifest, JSON report, markdown summary, and logic-test reports

Example manual inputs:

- `project_path`: `course-projects/security-awareness`
- `target`: `phishing-awareness/k12-district/default`
- `export_mode`: `standard` or `validation`

### `build-course-family.yml`

- runs on `workflow_dispatch`
- builds all valid template/variant/theme combinations for one course project
- runs the project logic tests before the batch build
- uploads all generated SCORM zips plus the aggregate manifest, CI reports, and logic-test reports

Use this when a course project represents a repeatable family of compliance or scenario variants.

## Recommended repository structure

The workflow templates assume a Git-friendly structure like this:

```text
/course-projects
  /security-awareness
    project.yaml
    /templates
    /variants
    /themes
    /assets
    /build
/module-library
  registry.yaml
  /modules
.github/workflows/
scripts/course-project-build.ts
```

The checked-in examples in this repo already follow that structure.

## CLI integration

The workflows call the same non-interactive build commands available locally:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
tsx scripts/course-project-build.ts export --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts export-all --project course-projects/security-awareness --mode validation
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --run-tests
```

Useful flags for CI:

- `--project <path>`
- `--target <template>/<variant>/<theme>`
- `--output <path>`
- `--json-report <path>`
- `--mode standard|validation`
- `--fail-on-warning`
- `--all`

## Build artifacts

Successful CI runs upload artifacts from the project `build/` folder, including:

- SCORM zips from `build/scorm12/`
- per-build manifests from `build/scorm12/*.build-manifest.json`
- dependency graphs from `build/dependency-graph.json`
- aggregate manifest `build/build-manifest.json`
- machine-readable JSON report `build/ci-build-report.json`
- markdown summary `build/build-summary.md`
- course logic test report `build/tests/course-test-report.json`
- course logic test summary `build/tests/course-test-summary.md`
- affected rebuild summaries under `build/affected/` when shared modules changed on push

These artifacts are generated outputs. They should not replace the source project files as the system of record.

## Manual vs automatic usage

Use GitHub Actions when you want:

- validation on pull requests
- reproducible builds on `main`
- downloadable artifacts from CI runs
- a reviewable build summary attached to the workflow run

Use the local CLI when you want:

- faster iteration during authoring
- local validation before commit
- targeted exports while changing templates, variants, or themes

## Customizing project paths

To adapt these workflows for another repo:

- keep course projects under `course-projects/`, or update the `for project_file in course-projects/*/project.yaml` loop
- update the default `workflow_dispatch` input values if your template/variant/theme ids differ
- keep build outputs in project `build/` folders or adjust the upload-artifact paths accordingly

## Source vs build boundary

The workflows are intentionally built around the existing platform boundary:

- source definitions live in Git
- validation runs before packaging
- SCORM zips are generated build artifacts
- CI uploads artifacts instead of committing them back to source
