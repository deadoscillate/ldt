# Canonical Model

The canonical in-memory model is the normalized course graph represented by `CanonicalCourse`.

Today that model is implemented by the normalized compiled course type in `src/lib/course/types.ts`.

## Why this model exists

- builder mode needs a stable target in memory
- source YAML needs one normalized destination
- preview should not invent its own data shape
- export should consume the same normalized structure as preview

## What maps into it

### Source YAML

Source YAML is parsed, schema-validated, template-resolved, and normalized into `CanonicalCourse`.

### Builder mode

Builder mode is a convenience projection over the same normalized course structure.

- builder edits serialize structured source
- that source runs through the same pipeline
- the resulting canonical model drives preview and export readiness

## What consumes it

### Preview

The browser preview consumes the canonical model directly.

### Export

SCORM export consumes the canonical model as input to the adapter/build layer.

## Public vs canonical node types

Public authoring types are intentionally constrained:

- `content`
- `question`
- `choice`
- `branch`
- `result`

Legacy alias:

- `quiz` is accepted and normalized to the canonical quiz node shape

Canonical runtime node types are narrower:

- `content`
- `choice`
- `quiz`
- `result`

That keeps public authoring expressive while the normalized runtime graph stays disciplined.
