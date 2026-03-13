# Reusable Module Libraries

Reusable modules let Sapio Forge teams compose many courses from the same source
components.

They are first-class source assets, not runtime plugins or copied slide fragments.

## Library structure

```text
/module-library
  registry.yaml
  /modules
    phishing_intro.yaml
    password_hygiene_reminder.yaml
    harassment_intro.yaml
    reporting_procedure.yaml
    escalation_policy.yaml
```

- `registry.yaml` is the machine-readable index.
- `modules/*.yaml` are the editable source files stored in Git.
- each module file can declare metadata, variables, tests, and structured nodes

## Module source format

Each module can define:

- `id`
- `title`
- `description`
- `version`
- `category`
- `tags`
- `lastUpdated`
- optional `templateData`
- optional `variableSchema`
- optional `tests`
- optional `blocks`
- `nodes`

Modules use the same constrained node structure as course templates, so they stay
compatible with the canonical compile pipeline.

## Variables and overrides

Modules can declare include-time variables with a constrained schema:

```yaml
variableSchema:
  variables:
    reportingChannel:
      type: text
      label: Reporting channel
      description: Approved reporting route shown inside the module.
```

Sapio Forge validates:

- required variables
- supported input types
- unknown override keys
- unresolved placeholders

Variable overrides are applied at compile time, never at runtime.

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

This keeps module composition visible in source review and deterministic in builds.

## Versioning rules

- pin exact versions for reproducible source
- omitting `version` resolves the latest available module and produces a warning
- missing pinned versions fail compile
- deprecated modules produce warnings
- the studio surfaces current version, latest version, and upgrade availability

This is intentionally simple. Sapio Forge is not trying to be a general-purpose
package manager.

## Module tests

Modules can declare lightweight reusable test metadata:

```yaml
tests:
  - id: intro-routes-to-inspect-email
    name: Intro continues into inspect-email
```

These module-level definitions document expected behavior, while course logic tests
still run against the fully expanded course build.

## Studio workflow

The studio now treats modules as a composition workflow:

1. browse or search the shared module library
2. inspect metadata, variables, versions, and usage
3. include the selected module in source with explicit version pins
4. preview the compiled output immediately
5. inspect affected builds and logic-test coverage

The same panel also supports extracting a current source step into a downloadable
module draft plus registry entry snippet.

## Compile-time behavior

Shared modules are resolved during compile:

1. source YAML is parsed
2. schema validation runs
3. block includes, template variables, and shared modules are resolved
4. the canonical course model is generated
5. graph validation runs
6. preview, tests, and SCORM builds consume the compiled model

Runtime code never resolves modules directly.

## Dependency graphs and impact

Project builds emit dependency data that records:

- source files involved in the build
- shared modules used
- module versions
- course-to-module and module-to-module edges

Use affected rebuilds when shared source changes:

```bash
tsx scripts/course-project-build.ts affected --module phishing_intro
tsx scripts/course-project-build.ts affected --changed module-library/modules/phishing_intro.yaml --run-tests
```

This detects which build targets depend on the changed source and rebuilds only the
affected outputs.

## Git guidance

Treat shared modules like source code:

- commit `module-library/registry.yaml`
- commit `module-library/modules/*.yaml`
- review module changes as text diffs
- keep SCORM zips and generated manifests out of source review unless needed

SCORM remains a build artifact. Shared modules remain source.
