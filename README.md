# Sapio Forge

Sapio Forge is a structured learning platform for building interactive training from source.

Build learning systems like software.

Define training modules as structured source, preview them in the browser, and export SCORM packages for any LMS.

Sapio Forge replaces slide-based course tools with structured authoring, reusable modules, realistic simulation shells, and reproducible builds.

## Key Idea

- define courses as structured source
- preview the learner experience in the browser
- compile SCORM packages for any LMS

## Core Capabilities

- structured course definitions
- reusable module libraries
- scene/component rendering pipeline with email, chat, and dashboard shells
- persistent multi-step simulation state with deterministic branching
- SCORM compilation
- version-controlled training systems

This repository is a GitHub-ready starter template for teams that want to manage interactive training modules as structured source files.

It is designed for a source-controlled workflow:

- course projects live in plain-text YAML
- templates, variable sets, and theme packs stay separate
- browser preview is compiled from validated source into scene shells and components
- realistic simulation scenes are authored through constrained email, chat, and dashboard shells
- learner decisions can persist across scenes through typed scenario state
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
- `module-library/`
  - reusable shared source modules plus `registry.yaml`
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
/module-library
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
   The studio loads starter examples directly from `course-projects/`, including
   phishing email, escalation chat, and dashboard review simulations.

4. Validate a starter project locally.

   ```bash
   npm run validate:project
   ```

5. Build one SCORM package from the default starter project.

   ```bash
   npm run build:project
   ```

6. Run the declarative logic tests for the default starter project.

   ```bash
   npm run test:course
   ```

7. Run logic tests across all starter projects.

   ```bash
   npm run test:all-courses
   ```

8. Build all starter variants for the default starter project.

   ```bash
   npm run build:all
   ```

9. Inspect the generated build outputs.

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
   - shared module source
   - theme pack files
2. Validation
   - schema checks
   - template-variable checks
   - graph and reference checks
3. Compilation
   - canonical in-memory course model
   - compiled preview model
   - scene shells and typed components derived from validated source
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
  - use Guided Editor
  - update the learner preview
  - export SCORM
- advanced path
  - open Source Editor and project mode
  - inspect YAML and project structure
  - validate project integrity
  - build reproducible export artifacts

Use Guided Editor when you want the fastest first module.

Use the starter repo and project mode when you want source-controlled team workflows.

For shell-specific authoring guidance, see:

- [docs/simulation-shells.md](docs/simulation-shells.md)
- [docs/shell-specific-interactions.md](docs/shell-specific-interactions.md)
- [docs/stateful-multi-step-simulations.md](docs/stateful-multi-step-simulations.md)
- [docs/authoring-stateful-scenarios.md](docs/authoring-stateful-scenarios.md)
- [docs/building-email-chat-and-dashboard-simulations.md](docs/building-email-chat-and-dashboard-simulations.md)
- [docs/building-interactive-email-chat-and-dashboard-simulations.md](docs/building-interactive-email-chat-and-dashboard-simulations.md)

## Beta feedback loop

The studio now includes a persistent `Send Feedback` button for external beta users.

Each submission can include:

- feedback type
- short description
- optional screenshot or captured studio view
- current screen, project, template, variant, and theme context

The platform also records lightweight telemetry for onboarding, preview, export, project import/export, and validation friction. See:

- [docs/providing-beta-feedback.md](docs/providing-beta-feedback.md)
- [docs/beta-telemetry.md](docs/beta-telemetry.md)

## Validate and build

Default local automation commands:

```bash
npm run validate:project
npm run test:course
npm run test:all-courses
npm run compile:project
npm run build:project
npm run build:all
npm run manifest:project
npm run clean:build
```

Direct CLI examples:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/security-awareness --all
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
tsx scripts/course-project-build.ts test --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts test --all-projects
tsx scripts/course-project-build.ts export --project course-projects/security-awareness --target phishing-awareness/k12-district/default
tsx scripts/course-project-build.ts export-all --project course-projects/security-awareness --mode validation
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --mode standard --run-tests
```

These commands produce deterministic outputs under each project's `build/` directory, including:

- SCORM zip artifacts
- per-build manifests
- dependency graphs
- aggregate `build-manifest.json`
- `ci-build-report.json`
- `build-summary.md`
- `tests/course-test-report.json`
- `tests/course-test-summary.md`

Shared modules now participate in the same source-controlled build flow:

- shared module source lives under `module-library/`
- templates include modules explicitly at compile time
- dependency graphs record which projects and builds depend on which modules
- `affected` rebuilds rebuild only the targets touched by a shared-source change

## Testable learning logic

Course projects can now define declarative learner-path tests under `tests/*.yaml`.

These tests simulate the learner against the canonical compiled course model and assert:

- terminal step
- score
- completion status
- pass/fail status
- variable values derived from the active variant and runtime state

This makes branching and scoring regressions visible before new SCORM builds are exported or merged in CI.

See:

- [docs/testing-course-logic.md](docs/testing-course-logic.md)
- [docs/why-testable-learning-logic-matters.md](docs/why-testable-learning-logic-matters.md)

## GitHub Actions

The starter repo ships with working GitHub Actions workflow templates:

- `validate-course-project.yml`
  - validates course projects on push and pull request
- `build-course-project.yml`
  - builds one course target manually or default targets on `main`
- `build-course-family.yml`
  - builds all valid variant/theme combinations for a project

They use the same local CLI commands and upload generated artifacts from `build/`.
When `module-library/` changes on `main`, the single-project build workflow now switches to
an affected rebuild run instead of rebuilding every default target.

## Shared modules

Shared module libraries are now a first-class Sapio Forge workflow.

They make repeatable training libraries easier to maintain:

- define reusable source modules in `module-library/modules/*.yaml`
- register them in `module-library/registry.yaml`
- declare module variables and lightweight module tests in source
- include them in course source with pinned versions and explicit overrides
- expand them at compile time before preview or SCORM export
- browse them in the studio with used-by and affected-build visibility
- trace them through dependency graphs, affected rebuilds, and course logic tests

See [docs/shared-modules.md](docs/shared-modules.md) for authoring, versioning, and rebuild guidance, and [docs/composing-courses-from-modules.md](docs/composing-courses-from-modules.md) for composition examples.

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
- [docs/providing-beta-feedback.md](docs/providing-beta-feedback.md)
- [docs/beta-telemetry.md](docs/beta-telemetry.md)
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
