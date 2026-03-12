# Course Projects

Course projects are the source-control boundary for repeatable course families.

## Purpose

A course project packages:

- project metadata
- one or more templates
- one or more variable sets
- one or more theme packs
- project-scoped assets

This keeps reusable source grouped in a portable plain-text folder instead of a loose set of files in studio state.

## Boundary

Course projects sit above the canonical course model.

- project source chooses template, variable set, and theme
- the compile pipeline resolves those inputs into the canonical model
- preview consumes the canonical model
- SCORM export consumes the canonical model plus build context

The project layer should never bypass normalization or export directly from raw YAML.

## Build metadata

Project-aware builds attach:

- project id and version
- template id
- variant id
- theme id
- source file list
- build manifest and fingerprint

This makes exports traceable back to source-controlled inputs.
