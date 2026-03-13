# CI/CD for Learning Modules

Structured learning modules should behave like source-controlled build inputs.

## Core model

- source files live in Git
- validation runs before packaging
- declarative learner-path tests run against compiled course logic
- the canonical normalized course model is compiled from source
- SCORM packages are reproducible artifacts
- build manifests and JSON reports make runs inspectable

## Why this matters

This workflow makes it easier to:

- review branching and scoring changes as text diffs
- catch branching, score, and pass/fail regressions before export
- rebuild course families consistently
- validate template, variant, and theme combinations automatically
- keep generated SCORM packages separate from editable source

## Typical CI flow

1. A pull request changes a course project, template, variable set, or theme pack.
2. `validate-course-project.yml` runs and checks every affected project against the source-driven pipeline.
3. The same workflow runs declarative course logic tests before merge.
4. On manual dispatch or on `main`, a build workflow packages one target or an entire course family.
5. CI uploads SCORM zips, manifests, JSON reports, and logic-test reports as artifacts.
6. Teams review source changes in Git and treat build outputs as generated evidence, not as the editable project.

## What this is not

This is not an LMS publishing pipeline.

The current CI integration stops at:

- source validation
- preview/build compilation
- SCORM packaging
- artifact upload

That keeps the platform focused on structured authoring, reproducible builds, and reviewable release artifacts.
