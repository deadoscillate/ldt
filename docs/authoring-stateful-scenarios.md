# Authoring Stateful Scenarios

Use Builder mode when you want guided forms. Use Source mode when you want the full YAML surface.

## Workflow

1. Define scenario state.
2. Add learner actions that update that state.
3. Add follow-up scenes that branch or change visibility based on it.
4. Run the preview and logic tests before export.

## Example: phishing simulation

State:

- `reportedPhishing`
- `openedAttachment`
- `riskScore`

Authoring pattern:

1. `inspect-email` lets the learner report or open the attachment.
2. The chosen option updates state.
3. `follow-up` branches to a safe or compromised outcome.
4. The warning banner only appears when the attachment was opened.

## Example: escalation chat

State:

- `escalatedCustomer`
- `verifiedOrder`
- `customerMood`
- `empathyScore`

Authoring pattern:

1. The first reply sets the conversation tone.
2. Later chat messages change depending on that tone.
3. A recovery scene appears only when the conversation has escalated.

## Example: dashboard triage

State:

- `documentedFacts`
- `preservedEvidence`
- `reviewedCase`
- `escalatedCase`
- `riskScore`

Authoring pattern:

1. Early reporting choices affect risk.
2. Follow-up dashboard cards appear only when facts or evidence are ready.
3. Final routing changes depending on the accumulated risk state.

## Builder mode guidance

Builder mode now supports:

- typed scenario variables
- option-driven state updates
- conditional next routes
- state-aware shell notices and callouts

Use Source mode when you need to author more detailed visibility rules across multiple nested components.

## Test before export

Use course logic tests for:

- safe path passes
- risky path fails
- score or risk totals match expectations
- final state variables match the intended scenario outcome

This keeps multi-step simulations deterministic and reviewable in Git.
