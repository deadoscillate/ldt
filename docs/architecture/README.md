# Architecture

LDT Engine is a structured authoring and compilation system.

Core direction:

- source definition is the editable system of record
- a canonical normalized course model is the in-memory model for preview and export
- preview and SCORM output are compiled build artifacts
- SCORM remains an adapter layer, not a core authoring concern

Architecture notes:

- [canonical-model.md](canonical-model.md)
- [compile-pipeline.md](compile-pipeline.md)
- [boundaries.md](boundaries.md)
- [course-projects.md](course-projects.md)
