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
- edit theme values

Builder view still generates structured YAML internally.

### Source view

Source view exposes the YAML directly.

Use it when you want to:

- inspect the exact source definition
- review a builder-generated course
- edit advanced fields directly
- upload or download source files for Git workflows

## Source and build distinction

Treat these as source:

- `template.yaml`
- `course.yaml`
- `template-data.yaml`

Treat these as build output:

- SCORM zip packages
- exported runtime files inside the package

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

## Theme customization

Themes are stored with the course definition:

```yaml
theme:
  primary: "#1f6feb"
  secondary: "#f3f6fb"
  font: Inter
  logo: https://example.com/logo.svg
  background: "#ffffff"
```

Theme values apply in:

- studio preview
- exported SCORM runtime

## Using this with Git

Recommended pattern:

1. Store templates under `/templates`.
2. Store course variants under `/courses`.
3. Commit `course.yaml` and `template-data.yaml`.
4. Review branching and scoring changes as text diffs.
5. Keep exported SCORM packages out of source control unless you have a specific release reason.

Why this works well in Git:

- branching logic is readable in plain text
- template changes are easy to isolate in commits
- repeated module families can share one structure with different variables
- source changes remain auditable over time

## Suggested project layout

```text
/templates
  /phishing-awareness-template
    template.yaml
    schema.yaml
    README.md

/courses
  /phishing-awareness-baseline
    course.yaml
    template-data.yaml
    README.md
```

This keeps authored source separate from build artifacts and makes handoff to other developers or instructional designers predictable.
