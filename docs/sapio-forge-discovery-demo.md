# Sapio Forge Discovery Demo

The `sapio-forge-discovery` project is a flagship demo module that also works as a lightweight discovery interview instrument.

Use it when you want to:

- show what Sapio Forge looks like in a short live demo
- ask potential users how they handle maintenance and reuse today
- dogfood shared modules, shells, stateful scenarios, and logic tests in a real project

## What it demonstrates

The demo intentionally shows:

- a shared maintenance problem framed in a dashboard shell
- structured discovery questions inside a chat shell
- a multi-course update request inside an email shell
- shared modules loaded from `module-library/`
- stateful branching and a final discovery summary
- SCORM-ready output from the same validated source

## Where it lives

- `course-projects/sapio-forge-discovery/`
- `module-library/modules/sapio_forge_update_notice.yaml`
- `module-library/modules/sapio_forge_pipeline_snapshot.yaml`

## How to open it

In the studio:

1. Open the setup step.
2. Open the starter example named `Sapio Forge discovery walkthrough`.
3. Preview the module or export it as SCORM.

From the CLI:

```bash
tsx scripts/course-project-build.ts validate --project course-projects/sapio-forge-discovery --all
tsx scripts/course-project-build.ts test --project course-projects/sapio-forge-discovery
tsx scripts/course-project-build.ts export --project course-projects/sapio-forge-discovery --target workflow-discovery/instructional-design-team/default
```

## Facilitator note

Use this module in:

- product demos
- discovery interviews
- investor or stakeholder walkthroughs
- internal dogfooding sessions

A simple facilitation pattern works well:

1. let the participant move through the module without interruption
2. pause at the discovery summary
3. ask why they chose those answers
4. capture any follow-up in the studio feedback button or your normal notes

## Reuse and adaptation

The project is intentionally structured to be reusable later.

- audience-specific copy lives in `variants/*.yaml`
- reusable intro and workflow explanation live in shared modules
- logic tests keep the branching and summary outcomes deterministic

That makes it easy to adapt the same walkthrough for customer discovery, internal onboarding, or stakeholder presentations.
