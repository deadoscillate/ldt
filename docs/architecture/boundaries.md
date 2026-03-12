# Boundaries

## Source vs preview vs export

- source definition is the editable system of record
- canonical normalized course is the in-memory model
- compiled preview is runtime output from the canonical model
- SCORM package is a generated build artifact

The SCORM zip is never treated as the editable project.

## Builder vs source mode

Builder mode is a structured helper layer.

It does not replace source:

- builder edits serialize structured source
- source edits re-enter the same pipeline
- both converge on the same canonical model

## Schema boundaries

The source schema is intentionally constrained.

- public node types are centralized
- layout primitives are centralized
- unknown fields are surfaced as validation errors
- template variables must resolve deterministically

## SCORM boundary

SCORM is isolated to:

- `src/lib/scorm/`
- `src/lib/export/`

The core authoring engine under `src/lib/course/` does not depend on SCORM runtime APIs or packaging concerns.

That keeps future output adapters possible without rewriting the course core.
