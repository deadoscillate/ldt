# Why Testable Learning Logic Matters

Sapio Forge learning modules can break in the same way software logic breaks.

Examples:

- a branch now points to the wrong step
- a quiz answer stops awarding score
- a result screen changes from `passed` to `failed`
- a shared module update changes the flow for many course variants

Without automated tests, those regressions often show up only after manual preview or LMS import.

## What this platform protects

The platform now treats course logic as testable source:

- source files remain the system of record
- the canonical compiled course model is what gets simulated
- SCORM packages remain build artifacts
- logic tests run before or alongside build/export workflows

## Why this matters for teams

For repeatable training libraries, logic tests help teams:

- catch regressions before export
- review branching changes with more confidence
- protect scored/pass-fail behaviors during refactors
- validate affected targets after shared-module changes
- use CI to keep large course families stable

This is part of the same product philosophy as structured authoring:

- readable source
- deterministic compilation
- reproducible builds
- inspectable artifacts
- regression protection
