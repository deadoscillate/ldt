# Getting Started

Sapio Forge helps teams create interactive training from structured source, preview it in the browser, and export SCORM packages for any LMS.

This starter repository is meant to be easy to clone, understand, and use right away.

## Install and run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/studio`

The studio loads starter examples from `course-projects/`.

The starter set now includes three structured simulation contexts:

- phishing email review with `email_shell`
- customer escalation messaging with `chat_shell`
- conduct-reporting dashboard review with `dashboard_shell`

If you are new to the platform:

- choose `Build your first course` for the beginner path
- choose `Open source view` when you want the Git-friendly advanced path

## Validate starter source

```bash
npm run validate:project
```

This validates the default starter project under `course-projects/security-awareness`.

## Run starter logic tests

```bash
npm run test:course
```

This simulates learner paths against the compiled course logic before SCORM export.

## Build one starter SCORM package

```bash
npm run build:project
```

## Build all starter variants

```bash
npm run build:all
```

## Inspect build outputs

Look under:

```text
course-projects/security-awareness/build/
```

## Try a different project

Example:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/workplace-conduct --all
tsx scripts/course-project-build.ts test --project course-projects/workplace-conduct
tsx scripts/course-project-build.ts export-all --project course-projects/workplace-conduct --mode standard
```

## Customize safely

- duplicate a project folder under `course-projects/`
- edit variants separately from template structure
- keep branding changes inside `themes/`
- keep exported SCORM packages out of source control

For the shortest guided path to a first export, see [first-module.md](first-module.md).

For shell-specific authoring guidance, see [simulation-shells.md](simulation-shells.md).
