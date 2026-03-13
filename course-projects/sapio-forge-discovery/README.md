# Sapio Forge Discovery Demo

This Course-as-Code project packages a flagship Sapio Forge walkthrough that also works as a lightweight discovery interview instrument.

Use it when you want to:

- show how Sapio Forge handles structured source, reusable modules, tests, preview, and SCORM export
- ask potential users how they handle maintenance and reuse today
- dogfood Sapio Forge with a real internal demo module

Source layout:

- `project.yaml`: project metadata and build targets
- `templates/workflow-discovery/`: shared demo flow and variable schema
- `variants/`: audience-specific discovery variants
- `themes/`: branded presentation kept separate from the learning logic
- `tests/`: declarative learner-path tests for the demo flow
- `build/`: generated SCORM artifacts only

This project intentionally reuses shared modules from `module-library/` so teams can see module reuse, dependency tracking, and affected rebuilds in a real demo.
