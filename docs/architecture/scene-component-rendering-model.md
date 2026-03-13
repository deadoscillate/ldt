# Scene / Component Rendering Model

Sapio Forge treats visual learning scenes as a compiled rendering layer on top of
the canonical course model.

The runtime pattern is:

`source YAML -> canonical node model -> derived scene -> component registry -> renderer`

## Why this exists

Sapio Forge is not a slide editor. It is a structured authoring system.

That means:

- source stays constrained and readable
- branching, scoring, and completion stay in the canonical node model
- visual output is compiled from structured source instead of hand-authored per-screen markup
- new visual experiences can be added without rewriting the runtime core

## Current compatibility model

Sapio Forge still compiles the existing canonical node types:

- `content`
- `choice`
- `quiz`
- `result`

Those node types are not removed.

Instead, each compiled node now carries a derived `scene` object with:

- `id`
- `layout`
- `components`
- `metadata`

This keeps the logic model stable while letting the renderer evolve.

## Layout shells vs components

Layout shells define structure.

Current shells:

- `card`
- `stacked`
- `two_column`
- `email_shell`
- `chat_shell`
- `dashboard_shell`
- `result_shell`

Components define content inside that shell.

Current component vocabulary:

- `title`
- `paragraph`
- `image`
- `callout`
- `button`
- `question_block`
- `result_card`
- `quote`
- `divider`
- `list`
- `email_header`
- `email_body`
- `email_attachment_list`
- `email_warning_banner`
- `chat_message`
- `chat_system_notice`
- `card`
- `metric`
- `status_badge`
- `panel_title`
- `dashboard_notice`

Shells decide where content goes.
Components decide what content renders.

## Simulation shells

Simulation shells are constrained visual containers, not freeform slides.

Current simulation-oriented shells:

- `email_shell`
  - inbox-style review flow
  - sender/subject metadata plus message body and learner decision area
- `chat_shell`
  - conversation stream plus structured decision point
- `dashboard_shell`
  - sidebar, status cards, and review panel for workplace-system simulations

Shell-specific source fields such as `email`, `chat`, and `dashboard` compile
into typed components before rendering. Course logic still stays in the canonical
node model.

## Legacy layout normalization

Older source fields such as:

- `layout: image-right`
- `media`
- `quote`
- `callout`
- `left` / `right`

are normalized during compile into scene shells and typed components.

This is intentional.
Source authoring remains stable while the rendering system becomes more extensible.

## Runtime boundary

The runtime still owns:

- current node selection
- branching transitions
- score updates
- completion and pass/fail logic
- SCORM state reporting

The scene renderer only owns:

- layout shell selection
- component lookup
- component rendering order
- visual presentation of the current node

This separation is important.
Presentation should not contain branching logic.

## Preview and SCORM parity

Both the browser preview and exported SCORM runtime now render through scene
registries.

That keeps:

- local preview output
- exported runtime output
- future component additions

aligned around the same compiled scene contract.

## Extension path

Future visual systems such as:

- richer email simulations
- richer chat simulations
- dashboards
- form-driven prompts

should extend the scene/component layer, not bypass it with ad hoc renderer branches.
