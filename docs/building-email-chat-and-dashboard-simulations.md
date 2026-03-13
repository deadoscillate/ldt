# Building Email, Chat, and Dashboard Simulations

Sapio Forge can now compile realistic simulation scenes from structured source by
combining:

- canonical course logic
- scene shells
- typed components
- shell-specific interactions

This page shows the three starter patterns shipped in the repository.

If you want the interactive version of these patterns, see
[building-interactive-email-chat-and-dashboard-simulations.md](building-interactive-email-chat-and-dashboard-simulations.md).

## 1. Phishing email review

Use `email_shell` when the learner should inspect a suspicious message before
choosing what to do next.

```yaml
- id: inspect-email
  type: branch
  shell: email_shell
  title: First move
  email:
    from: IT Support
    subject: "Urgent password reset required"
    previewText: "Your company access will expire today unless you confirm."
    warningBanner: "Pause before acting. Sender mismatch, urgency, and unexpected links are phishing indicators."
    attachments:
      - password-reset.html
  body:
    - "The message claims your access will expire unless you act immediately."
    - "Which action should happen before you click or reply?"
  options:
    - id: inspect
      label: Inspect the sender, links, and request
      next: red-flags
      score: 0
```

Use this when the training goal is message inspection and reporting judgment.

## 2. Customer escalation chat

Use `chat_shell` when the learner should read a short conversation and choose the
best response.

```yaml
- id: first-response
  type: branch
  shell: chat_shell
  title: Opening response
  chat:
    title: "Alpine Retail escalation chat"
    systemNotice: "Customer sentiment is elevated. The next reply should reduce tension and prepare a clean handoff."
    messages:
      - sender: Customer
        role: other
        timestamp: 9:41 AM
        text: "I have already called twice. Nobody has fixed this order."
      - sender: Agent
        role: self
        timestamp: 9:42 AM
        text: "I am reviewing the case now."
  body: What should you say first?
```

Use this when the learning goal depends on tone, sequencing, and response choice.

## 3. Workplace dashboard review

Use `dashboard_shell` when the learner should inspect a simplified system view
before acting.

```yaml
- id: follow-through
  type: choice
  shell: dashboard_shell
  title: Follow-through
  dashboard:
    title: Conduct case workspace
    notice: "Use the approved conduct channel, preserve evidence, and avoid informal side conversations."
    navItems:
      - Open cases
      - Evidence log
      - Reporting channels
    cards:
      - title: Documentation status
        text: Facts, dates, locations, and witnesses are ready to submit.
        metricLabel: Case priority
        metricValue: High
        status: warning
  body: What is the strongest next step?
```

Use this when the learner needs to review status indicators, cards, or queue-like
information before deciding.

## Studio workflow

In Builder mode:

1. Choose a node.
2. Select `Email shell`, `Chat shell`, or `Dashboard shell`.
3. Fill in the shell-specific fields.
4. Compile the preview and verify the scene.
5. Export the SCORM build when the preview and logic tests pass.

In Source mode:

1. Add `shell: ...` to the node.
2. Add the matching `email`, `chat`, or `dashboard` block.
3. Validate the source.
4. Preview the compiled scene.

## Recommended usage

- Keep shells focused on one context per node.
- Reuse simulation fragments through shared modules when the same workflow appears in multiple courses.
- Let course logic stay in `next`, `options`, `passNext`, `failNext`, and result nodes.
- Treat shells as presentation structure, not as a place to hide branching rules.

## Starter examples

The starter repository includes shell-backed examples in:

- `templates/phishing-awareness-template/template.yaml`
- `templates/customer-service-escalation-template/template.yaml`
- `templates/workplace-harassment-reporting-template/template.yaml`
- `course-projects/security-awareness/templates/phishing-awareness/template.yaml`
- `course-projects/customer-service/templates/customer-service-escalation/template.yaml`
- `course-projects/workplace-conduct/templates/conduct-reporting/template.yaml`
