# Composing Courses From Modules

Sapio Forge courses can be assembled from reusable source modules, template
variables, and theme packs without turning the source model into a no-code builder.

## Why composition matters

Module composition makes repeated course families easier to maintain:

- one phishing intro can be reused across K-12, healthcare, and enterprise variants
- one reporting-procedure module can appear in many conduct workflows
- one source change can trigger affected rebuilds instead of manual duplication

## Example: phishing awareness

```yaml
nodes:
  - include:
      module: phishing_intro
      version: 1.0.0
  - id: inspect-email
    type: branch
    title: First move
    ...
  - include:
      module: password_hygiene_reminder
      version: 1.0.0
```

The course still owns the branching graph. Shared modules provide reusable source
steps that plug into that graph.

## Example: conduct reporting

```yaml
nodes:
  - include:
      module: harassment_intro
      version: 1.0.0
  - id: report-essentials
    type: question
    ...
  - include:
      module: reporting_procedure
      version: 1.0.0
      with:
        reportingLabel: "{{reportingChannel}}"
```

This keeps the repeated reporting step reusable while still letting each course
family provide its own variable values.

## Modules vs templates

- templates define the overall course family structure
- variants provide course-specific variable values
- modules provide reusable source fragments inside that structure
- themes control presentation only

Templates answer "what kind of course family is this?"

Modules answer "which reusable source steps should this course include?"

## Studio workflow

Inside Sapio Forge Studio:

1. pick a course project, template, variant, and theme
2. browse the shared module library
3. inspect the module detail view
4. optionally set include-time variable overrides
5. insert the module into source
6. preview the compiled result
7. inspect affected builds and logic-test coverage

## Source review

Module composition stays explicit in source diffs:

- includes are visible in YAML
- version pins are visible in YAML
- variable overrides are visible in YAML
- dependency graphs and affected rebuilds can be regenerated from source

This is the point: courses remain understandable and reproducible as structured
source, not hidden runtime state.
