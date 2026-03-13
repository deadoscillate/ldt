# Getting Started

Sapio Forge is a structured learning platform that lets teams define training modules as source, compile them into SCORM packages, and deploy them to any LMS.

This starter repository is meant to be cloneable and immediately usable as a course-as-code workflow for training systems.

## Install and run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/studio`

The studio loads starter examples from `course-projects/`.

If you are new to the platform:

- choose `Build your first course` for the beginner path
- choose `Open source view` when you want the advanced Git-friendly path

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
