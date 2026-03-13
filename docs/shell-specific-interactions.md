# Shell-Specific Interactions

Sapio Forge treats shell interactions as structured source, not ad hoc UI behavior.

Email, chat, and dashboard scenes can expose learner actions through typed interaction
components that map back to canonical course options.

## Why this exists

Simulation shells make a scene look realistic.
Shell-specific interactions make that scene behave like a realistic training task.

The important boundary is unchanged:

- course logic still lives in `options`, `passNext`, `failNext`, and result nodes
- shell interactions only define how a learner triggers that logic inside the shell

## Available interaction components

### Email shell

- `email_link`
- `email_attachment`
- `email_action_button`

Use these for phishing review, suspicious invoices, or approval-request scenarios.

### Chat shell

- `chat_reply_option`
- `chat_choice_message`

Use these for escalation handling, coaching conversations, or social engineering over chat.

### Dashboard shell

- `dashboard_action_card`
- `dashboard_flag_toggle`
- `dashboard_review_item`

Use these for queue triage, compliance review, or service-desk decisions.

## Source model

Shell interactions are declared directly on a node:

```yaml
- id: inspect-email
  type: branch
  shell: email_shell
  options:
    - id: inspect
      label: Inspect the sender
      next: red-flags
      score: 0
    - id: click
      label: Open the attachment
      next: failed
      score: 0
  interactions:
    - id: inspect-sender
      type: email_link
      optionId: inspect
      label: Inspect sender details
      hrefLabel: it-support@example.com
      feedback: Correct: inspect sender details before you act.
    - id: open-attachment
      type: email_attachment
      optionId: click
      label: Open attachment
      fileName: password-reset.html
      feedback: Incorrect: opening an unexpected attachment is unsafe.
```

`optionId` is the key field.
It connects the visual interaction to the underlying course outcome.

## Runtime behavior

- choice and branch nodes treat shell interactions as immediate actions
- question and quiz nodes treat shell interactions as structured answer selection
- scoring, branching, completion, pass/fail, and SCORM reporting still run through the canonical runtime logic

This means shell interactions stay deterministic and testable.

## Validation rules

Sapio Forge validates:

- duplicate interaction ids
- missing `optionId` mappings
- shell/interation mismatches
- unsupported interaction types for the selected shell

Typical authoring errors include:

- an email link with no mapped option
- a chat reply used inside a dashboard shell
- a dashboard action that points to an option id that does not exist

## Builder workflow

In Builder mode:

1. Choose `Email shell`, `Chat shell`, or `Dashboard shell`.
2. Define the node options that own the actual outcomes.
3. Add shell interactions and map each one to an option id.
4. Preview the compiled scene.

The builder edits interaction presentation.
The mapped option still controls the branch or score behavior.

## Related docs

- [simulation-shells.md](simulation-shells.md)
- [building-email-chat-and-dashboard-simulations.md](building-email-chat-and-dashboard-simulations.md)
- [testing-course-logic.md](testing-course-logic.md)
