# Testing Course Logic

Sapio Forge course logic tests make branching, score, completion, and pass/fail behavior regression-testable.

## Why this exists

Interactive training modules are structured systems. A small source change can break:

- branch routing
- quiz scoring
- completion behavior
- pass/fail outcomes
- shared-module flows reused across many projects

Logic tests protect those behaviors before SCORM export.

## Test file format

Store logic tests in plain-text YAML under a project `tests/` directory.

Additional copyable example files live under `docs/examples/logic-tests/`.

Example:

```yaml
id: phishing-awareness
title: Phishing awareness logic tests
target:
  templateId: phishing-awareness
  themeId: default
tests:
  - id: correct-answer-passes
    name: Correct answer path passes
    target:
      variantId: k12-district
    actions:
      - step: intro
        advance: true
      - step: inspect-email
        select: inspect
      - step: red-flags
        select:
          - urgent
          - sender
    expect:
      terminalStep: passed
      score: 10
      completionStatus: completed
      successStatus: passed
```

## Supported actions

- `advance: true`
  - use on `content` steps
- `select: option-id`
  - use on `choice` or single-answer `quiz` steps
- `select: [option-a, option-b]`
  - use on multi-answer `quiz` steps

Tests are declarative. They do not allow arbitrary code or scripting.

## Supported assertions

- `terminalStep`
- `score`
- `scoreAtLeast`
- `completionStatus`
- `successStatus`
- `pathLength`
- `variables`

`variables` can assert compile-time variant values plus runtime tokens such as `score`, `maxScore`, `passingScore`, `percent`, and `courseTitle`.

## Running tests locally

Run all tests for one project:

```bash
tsx scripts/course-project-build.ts test --project course-projects/security-awareness
```

Run tests for one build target:

```bash
tsx scripts/course-project-build.ts test --project course-projects/security-awareness --target phishing-awareness/k12-district/default
```

Run tests across all starter projects:

```bash
tsx scripts/course-project-build.ts test --all-projects
```

## Output artifacts

Each project test run writes:

- `build/tests/course-test-report.json`
- `build/tests/course-test-summary.md`

The JSON report is machine-readable for CI. The markdown summary is readable in build logs or GitHub Actions summaries.

## Shared modules and affected rebuilds

Tests compile against the fully expanded canonical course model, so shared-module includes are resolved before simulation.

When shared modules change, affected rebuilds can also run logic tests:

```bash
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --run-tests
```

## Failure reporting

Failing tests report:

- suite id and test id
- target template/variant/theme
- expected vs actual outcome
- terminal step reached
- score reached
- learner path taken
- runtime warnings from compile
