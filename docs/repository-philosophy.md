# Repository Philosophy

The Sapio Forge starter repository is built around one idea:

interactive training modules can be managed like software projects.

Sapio Forge treats training modules as structured source, not presentation files. That makes the build pipeline reviewable, repeatable, and easier to maintain across course families.

## Principles

- source-controlled learning modules
- structured authoring as the source of truth
- reproducible SCORM builds
- clear preview/build/export pipeline
- templates and variables for repeatable course families
- theme packs for branding without mixing style into structure

## Why this is different

Traditional slide-based tools often hide branching inside duplicated slides and trigger logic.

This repository keeps branching, variables, themes, and build outputs explicit:

- templates define shared structure
- variants define organization-specific values
- theme packs define presentation tokens
- SCORM is compiled from validated source

## Source first

The editable system of record is always:

- YAML source
- project metadata
- token files
- assets

The exported SCORM zip is never the editable source project.

## Preview, build, export

The same structured source supports:

1. validation
2. compiled browser preview
3. deterministic SCORM export
4. CI build automation

That makes the repository suitable for Git review, repeatable rebuilds, and long-lived course families.
