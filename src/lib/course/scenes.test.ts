import assert from "node:assert/strict";
import test from "node:test";

import { parseAndCompileCourse } from "@/lib/course/parse";
import { collectNodeSceneWarnings, validateCompiledScene } from "@/lib/course/scenes";

test("legacy node layouts normalize into scene shells and components", () => {
  const course = parseAndCompileCourse(`
id: scene-normalization-check
title: Scene Normalization Check
start: intro
nodes:
  - id: intro
    type: content
    title: Phishing introduction
    layout: image-right
    body: Learn how phishing messages impersonate trusted senders.
    media:
      type: image
      src: phishing-example.png
      alt: Suspicious phishing inbox screenshot
    next: quiz
  - id: quiz
    type: question
    title: Spot the warning sign
    layout: question
    prompt: Which message is most suspicious?
    passNext: passed
    failNext: failed
    options:
      - id: suspicious
        label: Urgent password reset request
        correct: true
      - id: safe
        label: Internal newsletter
        correct: false
  - id: passed
    type: result
    title: Passed
    layout: result
    outcome: passed
    body: You identified the risky message.
  - id: failed
    type: result
    title: Failed
    layout: result
    outcome: failed
    body: Review the warning signs and try again.
`);

  assert.equal(course.nodes.intro.scene.layout, "two_column");
  assert.deepEqual(
    course.nodes.intro.scene.components.map((component) => component.type),
    ["title", "paragraph", "image"]
  );
  assert.deepEqual(
    course.nodes.intro.scene.components.map((component) => component.slot),
    ["main", "left", "right"]
  );

  assert.equal(course.nodes.quiz.scene.layout, "card");
  assert.ok(
    course.nodes.quiz.scene.components.some(
      (component) => component.type === "question_block"
    )
  );
  assert.equal(course.nodes.passed.scene.layout, "result_shell");
  assert.ok(
    course.nodes.passed.scene.components.some(
      (component) => component.type === "result_card"
    )
  );
});

test("scene validation reports unknown component types", () => {
  const course = parseAndCompileCourse(`
id: invalid-scene-check
title: Invalid Scene Check
start: intro
nodes:
  - id: intro
    type: content
    title: Intro
    body: Hello.
    next: done
  - id: done
    type: result
    title: Done
    outcome: neutral
    body: Finished.
`);

  const issues = validateCompiledScene({
    ...course.nodes.intro.scene,
    components: [
      ...course.nodes.intro.scene.components,
      {
        id: "intro__unknown",
        type: "unknown",
        slot: "main",
      } as never,
    ],
  });

  assert.equal(issues.length > 0, true);
});

test("explicit email, chat, and dashboard shells compile into shell-specific scene components", () => {
  const course = parseAndCompileCourse(`
id: simulation-shell-check
title: Simulation Shell Check
start: email-review
passingScore: 5
nodes:
  - id: email-review
    type: content
    shell: email_shell
    title: Inbox review
    email:
      from: IT Support
      subject: Urgent password reset required
      previewText: Account expires today.
      warningBanner: Inspect the sender and link before you act.
      attachments:
        - password-reset.html
    body: Review the email before choosing what to do next.
    next: support-chat
  - id: support-chat
    type: branch
    shell: chat_shell
    title: Escalation chat
    chat:
      title: Support team chat
      systemNotice: Customer sentiment is elevated.
      messages:
        - sender: Customer
          role: other
          timestamp: 9:41 AM
          text: I still need help with this request.
        - sender: Agent
          role: self
          timestamp: 9:42 AM
          text: I am reviewing the safest next step.
    body: Which response is strongest?
    options:
      - id: respond
        label: Confirm the issue and prepare the escalation
        next: dashboard-review
        score: 0
      - id: dismiss
        label: Tell them to wait without context
        next: failed
        score: 0
    interactions:
      - id: empathy-reply
        type: chat_choice_message
        optionId: respond
        sender: Agent
        role: self
        timestamp: 9:43 AM
        text: I can help with this. Let me confirm the details and escalate it correctly.
      - id: dismiss-reply
        type: chat_reply_option
        optionId: dismiss
        label: Ask the customer to wait without context
  - id: dashboard-review
    type: question
    shell: dashboard_shell
    title: Risk dashboard
    dashboard:
      title: Compliance review
      notice: Review the account flags before closing the case.
      navItems:
        - Queue
        - Escalations
      cards:
        - title: Flagged account
          text: Multiple suspicious password reset attempts.
          metricLabel: Severity
          metricValue: High
          status: warning
    body: Review the dashboard and pick the safest action.
    prompt: Which action is safest?
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: failed
    options:
      - id: investigate
        label: Investigate and route through the approved channel
        correct: true
      - id: ignore
        label: Ignore the flags and close the case
        correct: false
    interactions:
      - id: review-case
        type: dashboard_action_card
        optionId: investigate
        title: Review flagged case
        text: Open the flagged request and route it through the approved channel.
        status: warning
      - id: close-case
        type: dashboard_flag_toggle
        optionId: ignore
        label: Close case without review
        status: danger
  - id: passed
    type: result
    title: Passed
    outcome: passed
    body: Well done.
  - id: failed
    type: result
    title: Failed
    outcome: failed
    body: Try again.
`);

  assert.equal(course.nodes["email-review"].scene.layout, "email_shell");
  assert.deepEqual(
    course.nodes["email-review"].scene.components.map((component) => component.type),
    [
      "panel_title",
      "email_header",
      "email_warning_banner",
      "email_attachment_list",
      "email_body",
    ]
  );

  assert.equal(course.nodes["support-chat"].scene.layout, "chat_shell");
  assert.ok(
    course.nodes["support-chat"].scene.components.some(
      (component) => component.type === "chat_message"
    )
  );
  assert.ok(
    course.nodes["support-chat"].scene.components.some(
      (component) => component.type === "chat_system_notice"
    )
  );
  assert.ok(
    course.nodes["support-chat"].scene.components.some(
      (component) => component.type === "chat_choice_message"
    )
  );
  assert.ok(
    course.nodes["support-chat"].scene.components.some(
      (component) => component.type === "chat_reply_option"
    )
  );

  assert.equal(course.nodes["dashboard-review"].scene.layout, "dashboard_shell");
  assert.ok(
    course.nodes["dashboard-review"].scene.components.some(
      (component) =>
        component.type === "list" && component.slot === "sidebar"
    )
  );
  assert.ok(
    course.nodes["dashboard-review"].scene.components.some(
      (component) => component.type === "card"
    )
  );
  assert.ok(
    course.nodes["dashboard-review"].scene.components.some(
      (component) => component.type === "question_block"
    )
  );
  assert.ok(
    course.nodes["dashboard-review"].scene.components.some(
      (component) => component.type === "dashboard_action_card"
    )
  );
  assert.ok(
    course.nodes["dashboard-review"].scene.components.some(
      (component) => component.type === "dashboard_flag_toggle"
    )
  );

  assert.deepEqual(validateCompiledScene(course.nodes["email-review"].scene), []);
  assert.deepEqual(validateCompiledScene(course.nodes["support-chat"].scene), []);
  assert.deepEqual(validateCompiledScene(course.nodes["dashboard-review"].scene), []);
});

test("shell warnings stay readable when a simulation scene is under-specified", () => {
  const course = parseAndCompileCourse(`
id: sparse-dashboard-check
title: Sparse Dashboard Check
start: review
nodes:
  - id: review
    type: content
    shell: dashboard_shell
    title: Review queue
    body: Check the open item before you continue.
    next: done
  - id: done
    type: result
    title: Done
    outcome: neutral
    body: Finished.
`);

  const warnings = collectNodeSceneWarnings(course.nodes.review);

  assert.ok(
    warnings.some((warning) =>
      warning.includes('missing an expected shell component')
    )
  );
  assert.ok(
    warnings.some((warning) =>
      warning.includes('without any sidebar content')
    )
  );
});
