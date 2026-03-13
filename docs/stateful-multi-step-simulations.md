# Stateful Multi-Step Simulations

Sapio Forge now supports persistent simulation state across scenes.

Use state when an earlier learner action should change what happens later:

- a phishing attachment was opened
- a customer was escalated by a poor reply
- a dashboard case was reviewed before escalation

## Why Sapio Forge uses structured state

State is declared in source and validated during compilation.

- variables are typed
- updates are declarative
- branching stays deterministic
- tests can assert final outcomes without custom code

Sapio Forge does not rely on arbitrary scripting for scenario flow.

## State model

Courses can declare:

- `boolean`
- `number`
- `string`
- `enum`

Example:

```yaml
state:
  reportedPhishing:
    type: boolean
    initial: false
  riskScore:
    type: number
    initial: 0
  customerMood:
    type: enum
    initial: frustrated
    options:
      - frustrated
      - reassured
      - escalated
```

## Updating state

Choice, quiz, branch, and shell-triggered interactions can update state through their mapped options.

```yaml
options:
  - id: report-now
    label: Report phishing
    next: follow-up
    score: 0
    stateUpdates:
      - variable: reportedPhishing
        set: true
      - variable: investigationStatus
        set: reported
```

Supported update patterns:

- `set`
- `increment`
- `decrement`

## Branching on state

Use `nextWhen`, `passNextWhen`, or `failNextWhen` when later scenes depend on earlier decisions.

```yaml
next: report
nextWhen:
  - when:
      - variable: openedAttachment
        equals: true
    next: failed
  - when:
      - variable: reportedPhishing
        equals: true
    next: passed
```

Each conditional route should still include a fallback `next`, `passNext`, or `failNext`.

## State-aware visibility

Components can react to state without changing the underlying logic model.

Examples:

- email warning banners shown only after a risky click
- chat messages shown only when the conversation is escalated
- dashboard cards shown only when evidence has been reviewed

```yaml
callout:
  title: Approved response confirmed
  text: Security has already quarantined the message.
  visibleIf:
    - variable: reportedPhishing
      equals: true
```

## Preview and testing

The studio preview now shows:

- current scenario state
- current score
- recent action history

Course logic tests can assert scenario state directly:

```yaml
expect:
  terminalStep: passed
  state:
    reportedPhishing: true
    openedAttachment: false
```

## Source and build boundary

State is part of the validated source definition.

- source of truth: YAML, templates, variables, module includes
- preview: compiled runtime using persistent scenario state
- export build: SCORM package generated from validated source

Stateful behavior remains part of the structured compile pipeline, not an ad hoc runtime layer.
