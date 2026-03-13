# Simulation Shells

Sapio Forge uses simulation shells to present structured learning content inside
realistic workplace contexts without falling back to freeform slide design.

Shells are compiled visual containers.
They are not the source of truth for branching or scoring.

Shell-specific interactions now let those containers host realistic learner
actions while still mapping back to canonical course options.

## Why shells exist

Simulation shells let teams author realistic scenarios while keeping the platform
constrained and source-driven.

Use shells when you want:

- inbox-style phishing review
- chat-based decision making
- dashboard-based workplace workflows

Do not use shells to hand-place arbitrary content.

## Available shells

### `email_shell`

Best for:

- phishing awareness
- approval-request review
- suspicious invoice scenarios

Typical source fields:

- `shell: email_shell`
- `email.from`
- `email.subject`
- `email.previewText`
- `email.warningBanner`
- `email.attachments`

### `chat_shell`

Best for:

- manager coaching conversations
- customer escalation flows
- social engineering over chat

Typical source fields:

- `shell: chat_shell`
- `chat.title`
- `chat.systemNotice`
- `chat.messages`

### `dashboard_shell`

Best for:

- compliance reviews
- queue triage
- account-risk or service-desk checks

Typical source fields:

- `shell: dashboard_shell`
- `dashboard.title`
- `dashboard.notice`
- `dashboard.navItems`
- `dashboard.cards`

## Shells vs layouts

Shells define the simulation frame.

Layouts still describe structured content primitives such as:

- text
- image placement
- question/result presentation

In other words:

- shell = simulation context
- layout = content arrangement
- components = rendered content blocks inside the shell

## Validation behavior

Sapio Forge validates shell names and shell-specific source structure during
compile.

It also emits readable warnings when a scene uses a shell but lacks expected
simulation content, such as:

- an email shell without message metadata
- a chat shell without messages
- a dashboard shell without sidebar or card content

Warnings do not change course logic.
They help authors strengthen the realism of the scene.

## Logic boundary

Shells only affect presentation.

Shell-specific interactions affect presentation plus action capture, but they do
not own branching or score logic.

Branching, score, completion, pass/fail, SCORM reporting, and learner state stay
in the canonical course model and runtime engine.

## Related docs

- [building-email-chat-and-dashboard-simulations.md](building-email-chat-and-dashboard-simulations.md)
- [shell-specific-interactions.md](shell-specific-interactions.md)
- [building-interactive-email-chat-and-dashboard-simulations.md](building-interactive-email-chat-and-dashboard-simulations.md)
- [architecture/scene-component-rendering-model.md](architecture/scene-component-rendering-model.md)
