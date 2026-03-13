# Building Interactive Email, Chat, and Dashboard Simulations

Sapio Forge can now compile realistic simulation scenes with meaningful learner
actions, not just shell styling.

Use this pattern when learners should:

- inspect an email before acting
- choose a response inside a chat conversation
- triage work inside a dashboard or queue view

## 1. Phishing email interaction

Use `email_shell` plus `email_link`, `email_attachment`, and `email_action_button`
when a learner should act inside a suspicious message.

```yaml
- id: inspect-email
  type: branch
  shell: email_shell
  email:
    from: IT Support
    subject: "Urgent password reset required"
    attachments:
      - password-reset.html
  options:
    - id: inspect
      label: Inspect the sender
      next: red-flags
      score: 0
    - id: report-now
      label: Report phishing
      next: report
      score: 0
    - id: click
      label: Open attachment
      next: failed
      score: 0
  interactions:
    - id: inspect-sender
      type: email_link
      optionId: inspect
      label: Inspect sender details
      hrefLabel: it-support@example.com
    - id: report-phishing
      type: email_action_button
      optionId: report-now
      label: Report phishing
    - id: open-password-reset
      type: email_attachment
      optionId: click
      label: Open attachment
      fileName: password-reset.html
```

## 2. Customer escalation chat interaction

Use `chat_shell` plus `chat_choice_message` or `chat_reply_option` when a learner
should choose how to respond in a conversation.

```yaml
- id: first-response
  type: branch
  shell: chat_shell
  chat:
    title: "Support escalation chat"
    messages:
      - sender: Customer
        role: other
        text: "I have already called twice."
  options:
    - id: acknowledge
      label: Acknowledge and help
      next: escalation-question
      score: 0
    - id: policy
      label: Read the policy first
      next: failed
      score: 0
  interactions:
    - id: empathy-reply
      type: chat_choice_message
      optionId: acknowledge
      sender: Agent
      role: self
      text: I can see why this is frustrating. Let me help.
    - id: policy-reply
      type: chat_choice_message
      optionId: policy
      sender: Agent
      role: self
      text: I need to read the return policy first.
```

## 3. Dashboard triage interaction

Use `dashboard_shell` plus `dashboard_action_card`, `dashboard_review_item`, and
`dashboard_flag_toggle` when the learner is reviewing tasks, warnings, or queue items.

```yaml
- id: follow-through
  type: choice
  shell: dashboard_shell
  dashboard:
    title: Conduct case workspace
    navItems:
      - Open cases
      - Evidence log
  options:
    - id: channel
      label: Submit through approved channel
      next: passed
      score: 0
    - id: wait
      label: Wait and see
      next: failed
      score: 0
  interactions:
    - id: submit-report
      type: dashboard_action_card
      optionId: channel
      title: Submit through approved channel
      text: Route the documented facts now.
      status: positive
    - id: wait-flag
      type: dashboard_flag_toggle
      optionId: wait
      label: Mark for later follow-up
      status: warning
```

## Builder workflow

In the studio:

1. Pick a shell-aware starter example.
2. Choose the simulation shell on the node.
3. Add node options.
4. Add shell interactions and map each one to an option.
5. Preview the compiled simulation.
6. Run logic tests before export when the scenario matters.

## Why this matters

The learner sees realistic simulation actions.
The platform still sees deterministic source, canonical options, and reproducible builds.
