# Template Packs

Sapio Forge template packs turn repeatable course families into a first-class source workflow.

The starter repository includes three example packs:

- `template-packs/security-awareness`
- `template-packs/workplace-conduct`
- `template-packs/customer-service-escalation`

## What a template pack is

A template pack groups together:

- pack metadata
- one or more shared templates
- variable schemas for each template
- one or more variant YAML files
- README notes for Git-backed teams

The studio treats the workflow explicitly:

1. choose a template pack
2. choose a shared template
3. choose or duplicate a variable set
4. compile the resulting course variant
5. export a SCORM build

## Source layout

Example:

```text
/template-packs
  /security-awareness
    pack.yaml
    README.md
    /variants
      k12-district-phishing.yaml
      healthcare-org-phishing.yaml

/templates
  /phishing-awareness-template
    template.yaml
    schema.yaml
    README.md
```

Shared templates stay in `/templates`. Template packs reference those templates and organize the variant files that generate a course family from the same branching source.

## Pack metadata

`pack.yaml` captures the catalog-level metadata:

- `id`
- `title`
- `description`
- `category`
- `recommendedUseCase`
- `templates`
- `variants`

Each template entry points to:

- the shared `template.yaml`
- its `schema.yaml`
- its template README

Each variant entry points to a variant YAML file with:

- `id`
- `title`
- `description`
- `templateId`
- `notes`
- `values`

## Variable schemas

Each template schema declares the allowed variables and types.

Supported field types:

- `text`
- `number`
- `boolean`
- `url`
- `email`
- `color`

The studio uses this schema to:

- generate the variable-editing form
- validate required values
- validate value types
- reject undeclared extra variables by default

## Validation rules

Variable validation happens before template interpolation.

The pipeline will fail if:

- a required variable is missing
- a value does not match its declared type
- a placeholder is still unresolved
- an undeclared variable is supplied when additional variables are not allowed

## Duplicating a variant

The fastest repeatable workflow is:

1. select an existing variable set
2. click `Duplicate as new variant`
3. rename the variant title and id
4. edit the values
5. compile and export

This keeps the shared template source unchanged while producing a new course variant from plain-text source.

## Batch builds

Batch export lets a team generate multiple SCORM packages from one shared template.

The bundle includes:

- one SCORM zip per selected variant
- `build-summary.json`

The summary records:

- template used
- variant used
- course id and title
- export mode
- diagnostics enabled or disabled
- build timestamp
- output filename

## Git guidance

Recommended practice:

- commit shared template changes separately from variant YAML changes
- review variant YAML as text diffs
- keep exported SCORM packages out of source control
- treat template packs and variant YAML as the source of truth

SCORM zips remain build artifacts that can always be regenerated from pack source.
