# Structured Authoring

LDT Engine is built around a simple rule:

Source files are the asset. Preview and SCORM packages are compiled output.

## What that means

- course logic lives in readable YAML
- branching is explicit instead of hidden in visual triggers
- templates and variables let teams generate repeated module families quickly
- SCORM packages are build artifacts, not the thing you edit later

This model is intentionally closer to Markdown, static-site generation, or infrastructure-as-code than to a slide editor.

## Builder view vs Source view

The studio has two ways to work with the same source model.

### Builder view

Builder view is a convenience layer for non-technical users.

It lets you:

- add steps with forms
- select node type
- choose a layout primitive
- set branching targets
- configure score and result behavior

Builder view still generates structured YAML internally. Branding stays separate through theme-pack selection in the studio.

### Source view

Source view exposes the YAML directly.

Use it when you want to:

- inspect the exact source definition
- review a builder-generated course
- edit advanced fields directly
- upload or download source files for Git workflows

## Source and build distinction

Treat these as source:

- `template-packs/*/pack.yaml`
- `template-packs/*/variants/*.yaml`
- `template.yaml`
- `course.yaml`
- `template-data.yaml`

Treat these as build output:

- SCORM zip packages
- exported runtime files inside the package
- validation diagnostics and LMS testing notes

If a team needs to update a module later, they should go back to the source files, not edit the exported package.

## Layout primitives

Supported layout values:

- `title`
- `text`
- `image`
- `video`
- `two-column`
- `image-left`
- `image-right`
- `quote`
- `callout`
- `question`
- `result`

Each layout is a structured field in source and renders through shared runtime templates. The layout system is meant to improve consistency, not to become a free-form canvas.

## Templates and variables

Templates support:

- reusable `blocks`
- `templateData`
- compile-time placeholder substitution using `{{variableName}}`
- template packs that group shared templates with multiple variable sets

Example:

```yaml
templateData:
  departmentName: Human Resources
  escalationEmail: hr@example.com

nodes:
  - id: intro
    type: content
    title: "{{departmentName}} reporting basics"
    body:
      - "Escalate concerns to {{escalationEmail}}."
```

Rules:

- interpolation only applies to strings
- interpolation happens at compile time
- missing variables fail validation
- no scripting or dynamic code is allowed

## Theme packs

Themes are reusable source assets stored separately from course definitions:

```text
/themes
  /default
    theme.yaml
    tokens.yaml
    /assets
      logo.svg
```

Theme packs define constrained tokens for:

- color
- typography
- spacing
- component radii and borders
- optional logo/font assets

Theme packs apply in:

- studio preview
- exported SCORM runtime

The YAML course definition remains the structural source of truth.

## Using this with Git

Recommended pattern:

1. Store shared templates under `/templates`.
2. Organize repeatable course families under `/template-packs`.
3. Store course variants under `/courses` when you need a dedicated project folder.
4. Commit template, pack, and variant YAML separately.
5. Review branching and scoring changes as text diffs.
6. Keep exported SCORM packages out of source control unless you have a specific release reason.

Why this works well in Git:

- branching logic is readable in plain text
- template changes are easy to isolate in commits
- repeated module families can share one structure with different variables
- source changes remain auditable over time

## Suggested project layout

```text
/template-packs
  /security-awareness
    pack.yaml
    README.md
    /variants
      healthcare-org-phishing.yaml

/templates
  /phishing-awareness-template
    template.yaml
    schema.yaml
    README.md

/themes
  /default
    theme.yaml
    tokens.yaml
    /assets
      logo.svg

/courses
  /phishing-awareness-baseline
    course.yaml
    template-data.yaml
    README.md
```

This keeps authored source separate from build artifacts and makes handoff to other developers or instructional designers predictable.
