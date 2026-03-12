# LDT Engine Starter Repository

This repository is a GitHub-ready starter template for teams that want to manage interactive training modules as structured source files.

It is designed for a source-controlled workflow:

- course projects live in plain-text YAML
- templates, variable sets, and theme packs stay separate
- browser preview is compiled from validated source
- SCORM 1.2 packages are reproducible build artifacts

If you are evaluating the platform, start here. The repo already includes example course projects, reusable template packs, reusable theme packs, and GitHub Actions workflows for validation and builds.

## What is included

- `course-projects/`
  - `security-awareness`
  - `workplace-conduct`
  - `customer-service`
- `template-packs/`
  - `security-awareness`
  - `workplace-conduct`
  - `customer-service-escalation`
- `themes/`
  - `default`
  - `corporate-blue`
  - `dark`
- `.github/workflows/`
  - `validate-course-project.yml`
  - `build-course-project.yml`
  - `build-course-family.yml`
- `docs/`
  - quick-start, build-artifact, GitHub Actions, and structured-authoring docs
- `starter-repo.yaml`
  - a repo-level manifest describing the shipped starter contents

## Repository layout

```text
/course-projects
  /security-awareness
  /workplace-conduct
  /customer-service
/template-packs
/themes
/assets
/build
/docs
/.github/workflows
README.md
.gitignore
starter-repo.yaml
```

## Quick Start

1. Install dependencies.

   ```bash
   npm install
   ```

2. Start the local app.

   ```bash
   npm run dev
   ```

3. Open the starter studio at `http://localhost:3000/studio`.
   The studio loads starter examples directly from `course-projects/`.

4. Validate a starter project locally.

   ```bash
   npm run validate:project
   ```

5. Build one SCORM package from the default starter project.

   ```bash
   npm run build:project
   ```

6. Build all starter variants for the default starter project.

   ```bash
   npm run build:all
   ```

7. Inspect the generated build outputs.

   ```text
   course-projects/security-awareness/build/
   ```

If you want the shortest guided walkthrough, follow [docs/first-module.md](docs/first-module.md).

## How the platform works

The platform follows a strict source-to-build model:

1. Source definition
   - `project.yaml`
   - template YAML
   - variant YAML
   - theme pack files
2. Validation
   - schema checks
   - template-variable checks
   - graph and reference checks
3. Compilation
   - canonical in-memory course model
   - compiled preview model
4. Export build
   - SCORM 1.2 package
   - build manifest
   - JSON build report

This is not a slide editor. It is structured authoring and compilation for training modules.

## Preview locally

The app includes:

- `/`
  - public landing page
- `/validation`
  - public LMS proof center
- `/studio`
  - structured authoring studio with starter examples loaded from `course-projects/`

In the studio, the normal starter workflow is:

1. Choose a source project.
2. Choose a template, variant, and theme.
3. Compile the preview.
4. Export a standard SCORM package or an LMS validation build.

## Beginner and advanced paths

The studio now exposes two clear starting modes:

- beginner path
  - choose a starter project
  - use Builder mode
  - compile preview
  - export SCORM
- advanced path
  - open source/project mode
  - inspect YAML and project structure
  - validate project integrity
  - build reproducible export artifacts

Use Builder mode when you want the fastest first module.

Use the starter repo and project mode when you want source-controlled team workflows.

## Validate and build

Default local automation commands:

```bash
npm run validate:project
npm run compile:project
npm run build:project
npm run build:all
npm run manifest:project
npm run clean:build
```

Direct CLI examples:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts export --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts export-all --project course-projects/security-awareness --mode validation
```

These commands produce deterministic outputs under each project's `build/` directory, including:

- SCORM zip artifacts
- per-build manifests
- aggregate `build-manifest.json`
- `ci-build-report.json`
- `build-summary.md`

## GitHub Actions

The starter repo ships with working GitHub Actions workflow templates:

- `validate-course-project.yml`
  - validates course projects on push and pull request
- `build-course-project.yml`
  - builds one course target manually or default targets on `main`
- `build-course-family.yml`
  - builds all valid variant/theme combinations for a project

They use the same local CLI commands and upload generated artifacts from `build/`.

## How to Customize

### Duplicate a course project

1. Copy a project folder under `course-projects/`.
2. Update `project.yaml`.
3. Adjust template, variant, and theme references.
4. Validate before committing.

### Change variables

Edit the project `variants/*.yaml` files or use the studio to duplicate and modify a variant.

### Apply a different theme

Switch the selected theme in the studio, or update project defaults and available themes in `project.yaml`.

### Add a new template pack

1. Create a new directory under `template-packs/`.
2. Add `pack.yaml`, a README, and variant files.
3. Point pack entries at shared template source and schema files.

### Commit source files in Git

Commit:

- `project.yaml`
- template YAML
- variant YAML
- theme pack metadata and token files
- assets
- README and docs files

Do not treat generated SCORM zips as source of truth.

## Source vs build artifacts

Keep this boundary strict:

- source of truth
  - YAML, theme tokens, project metadata, and assets
- generated outputs
  - compiled preview models
  - SCORM packages
  - manifests and CI build reports

SCORM packages are build artifacts. They are not the editable project.

## Example starter contents

### Course projects

- `course-projects/security-awareness`
  - phishing-awareness course family with K-12, healthcare, and enterprise variants
- `course-projects/workplace-conduct`
  - workplace-conduct reporting family with multiple variants and two themes
- `course-projects/customer-service`
  - customer-service escalation scenario with a single starter variant

### Template packs

- `template-packs/security-awareness`
- `template-packs/workplace-conduct`
- `template-packs/customer-service-escalation`

### Theme packs

- `themes/default`
- `themes/corporate-blue`
- `themes/dark`

## Documentation map

- [docs/getting-started.md](docs/getting-started.md)
- [docs/first-module.md](docs/first-module.md)
- [docs/course-projects.md](docs/course-projects.md)
- [docs/template-packs.md](docs/template-packs.md)
- [docs/theme-packs.md](docs/theme-packs.md)
- [docs/build-pipeline.md](docs/build-pipeline.md)
- [docs/build-artifacts.md](docs/build-artifacts.md)
- [docs/github-actions.md](docs/github-actions.md)
- [docs/ci-cd-for-learning-modules.md](docs/ci-cd-for-learning-modules.md)
- [docs/repository-philosophy.md](docs/repository-philosophy.md)
- [docs/structured-authoring.md](docs/structured-authoring.md)
- [docs/lms-validation.md](docs/lms-validation.md)
- [docs/architecture/README.md](docs/architecture/README.md)

## Current validation baseline

Validated in SCORM Cloud for:

- launch
- completion
- score
- pass/fail
- resume

Broader LMS interoperability testing is still in progress. See `/validation` and [docs/testing-in-real-lmss.md](docs/testing-in-real-lmss.md).
