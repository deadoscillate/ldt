# Course Projects

Sapio Forge course projects make structured authoring behave like a small software project.

The starter repository already ships with four example projects under `course-projects/`:

- `security-awareness`
- `workplace-conduct`
- `customer-service`
- `sapio-forge-discovery`

The source of truth is the project source:

- `project.yaml`
- template YAML
- variable-set YAML
- shared module references
- theme pack files
- declarative learner-path tests under `tests/*.yaml`
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
    /tests
/module-library
  registry.yaml
  /modules
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
- logic test definitions

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

## Course logic tests

Each project can include declarative logic test suites under `tests/*.yaml`.

These suites define:

- target template, variant, and theme
- learner actions such as `advance` and `select`
- expected outcomes such as terminal step, score, completion, and pass/fail

Run them locally with:

```bash
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
```

Filter to one target when needed:

```bash
tsx scripts/course-project-build.ts test --project course-projects/security-awareness --target phishing-awareness/k12-district/default
```

## Using course projects in a build pipeline

Course projects can now be validated and built from the command line.

Examples:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
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
- `build/dependency-graph.json`
- `build/build-manifest.json`
- `build/ci-build-report.json`
- `build/build-summary.md`
- `build/tests/course-test-report.json`
- `build/tests/course-test-summary.md`

Warnings stay non-fatal unless you pass `--fail-on-warning`.

For shared-source maintenance:

```bash
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --run-tests
```

That command detects impacted targets from the dependency graph and rebuilds only the affected outputs.
