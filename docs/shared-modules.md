# Shared Modules

Shared modules let multiple course projects reuse the same structured source.

They are first-class source assets, not runtime plugins.

## Library structure

```text
/module-library
  registry.yaml
  /modules
    harassment_intro.yaml
    reporting_procedure.yaml
    escalation_policy.yaml
    phishing_intro.yaml
```

- `registry.yaml` is the machine-readable index used by validation and dependency tracking.
- `modules/*.yaml` are the editable source files.

## Module source format

Each module declares:

- `id`
- `title`
- `description`
- `version`
- `category`
- `tags`
- `lastUpdated`
- optional `templateData`
- optional `blocks`
- `nodes`

Module nodes use the same constrained authoring structure as course templates.

## Including a shared module

Use an explicit include inside course source:

```yaml
- include:
    module: harassment_intro
    version: 1.0.0
```

Optional overrides can be passed with `with:`:

```yaml
- include:
    module: reporting_procedure
    version: 1.0.0
    with:
      reportingLabel: "{{reportingChannel}}"
```

## Versioning rules

- pinned versions are preferred for reproducible source
- omitting `version` resolves the latest available module and produces a warning
- missing or invalid pinned versions fail compile
- deprecated modules produce warnings

This is intentionally simple. It is not a package manager.

## Compile-time behavior

Shared modules are resolved during compile:

1. source YAML is parsed
2. schema validation runs
3. block includes, template variables, and shared modules are resolved
4. the canonical course model is generated
5. graph validation runs
6. preview and SCORM builds consume the compiled model

Runtime code never resolves modules directly.

## Dependency graphs

Project builds now emit `build/dependency-graph.json`.

This records:

- project target
- source files involved in the build
- shared modules used
- module versions
- course-to-module and module-to-module edges

## Affected rebuilds

Use the `affected` command when shared source changes:

```bash
tsx scripts/course-project-build.ts affected --module phishing_intro
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml
```

This:

- detects which build targets depend on the changed source
- rebuilds only affected outputs
- writes an affected rebuild manifest and summary

## Git guidance

Treat shared modules like source code:

- commit `module-library/registry.yaml`
- commit `module-library/modules/*.yaml`
- review module changes as text diffs
- keep SCORM zips and build outputs out of source review unless explicitly needed

SCORM remains a build artifact. Shared modules remain source.
