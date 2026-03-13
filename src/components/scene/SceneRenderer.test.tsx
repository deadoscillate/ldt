import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { SceneRenderer } from "@/components/scene/SceneRenderer";
import {
  resolveSceneComponentRenderer,
  resolveSceneLayoutRenderer,
} from "@/components/scene/registry";
import { parseAndCompileCourse } from "@/lib/course/parse";
import { initializeRuntime } from "@/lib/runtime/engine";

test("scene renderer resolves registered components and layouts", () => {
  assert.ok(resolveSceneComponentRenderer("title"));
  assert.ok(resolveSceneComponentRenderer("question_block"));
  assert.ok(resolveSceneComponentRenderer("email_header"));
  assert.ok(resolveSceneComponentRenderer("email_action_button"));
  assert.ok(resolveSceneComponentRenderer("chat_message"));
  assert.ok(resolveSceneComponentRenderer("chat_reply_option"));
  assert.ok(resolveSceneComponentRenderer("card"));
  assert.ok(resolveSceneComponentRenderer("dashboard_action_card"));
  assert.ok(resolveSceneLayoutRenderer("two_column"));
  assert.ok(resolveSceneLayoutRenderer("result_shell"));
  assert.ok(resolveSceneLayoutRenderer("email_shell"));
  assert.ok(resolveSceneLayoutRenderer("chat_shell"));
  assert.ok(resolveSceneLayoutRenderer("dashboard_shell"));
});

test("scene renderer renders shell and component output from compiled scenes", () => {
  const course = parseAndCompileCourse(`
id: scene-renderer-check
title: Scene Renderer Check
start: intro
nodes:
  - id: intro
    type: content
    title: Scene intro
    layout: two-column
    left:
      title: Context
      text: Learners read the scenario setup here.
    right:
      image: screenshot.png
    next: done
  - id: done
    type: result
    title: Done
    outcome: neutral
    body: Complete.
`);

  const markup = renderToStaticMarkup(
    <SceneRenderer
      course={course}
      node={course.nodes.intro}
      state={initializeRuntime(course)}
    />
  );

  assert.match(markup, /scene-shell-two-column/);
  assert.match(markup, /data-component-type="title"/);
  assert.match(markup, /data-component-type="image"/);
});

test("scene renderer surfaces unknown component errors without crashing", () => {
  const course = parseAndCompileCourse(`
id: scene-render-error-check
title: Scene Render Error Check
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
    body: Complete.
`);
  const runtimeState = initializeRuntime(course);
  const introNode = {
    ...course.nodes.intro,
    scene: {
      ...course.nodes.intro.scene,
      components: [
        ...course.nodes.intro.scene.components,
        {
          id: "intro__broken",
          type: "unknown",
          slot: "main",
        } as never,
      ],
    },
  };

  const markup = renderToStaticMarkup(
    <SceneRenderer course={course} node={introNode} state={runtimeState} />
  );

  assert.match(markup, /Unknown component type/);
});

test("scene renderer outputs email, chat, and dashboard simulation shells", () => {
  const course = parseAndCompileCourse(`
id: shell-renderer-check
title: Shell Renderer Check
start: email-review
nodes:
  - id: email-review
    type: choice
    shell: email_shell
    title: Inbox review
    email:
      from: IT Support
      subject: Urgent password reset required
      previewText: Your account expires today.
      warningBanner: Inspect the sender before you act.
      attachments:
        - password-reset.html
    body: Review the message first.
    options:
      - id: report
        label: Report phishing
        next: support-chat
        score: 0
      - id: open
        label: Open attachment
        next: done
        score: 0
    interactions:
      - id: report-phishing
        type: email_action_button
        optionId: report
        label: Report phishing
      - id: open-attachment
        type: email_attachment
        optionId: open
        label: Open attachment
        fileName: password-reset.html
  - id: support-chat
    type: branch
    shell: chat_shell
    title: Escalation chat
    chat:
      title: Support conversation
      systemNotice: Customer sentiment is elevated.
      messages:
        - sender: Customer
          role: other
          text: I still need help.
        - sender: Agent
          role: self
          text: I am reviewing the next step.
    body: Decide how to respond.
    options:
      - id: deescalate
        label: Acknowledge and clarify
        next: dashboard-review
        score: 0
      - id: dismiss
        label: Dismiss the concern
        next: done
        score: 0
    interactions:
      - id: empathy-reply
        type: chat_reply_option
        optionId: deescalate
        label: Acknowledge and clarify
  - id: dashboard-review
    type: question
    shell: dashboard_shell
    title: Review dashboard
    dashboard:
      title: Compliance review
      notice: Check the account flags before closing the case.
      navItems:
        - Queue
        - Escalations
      cards:
        - title: Flagged account
          text: Multiple suspicious password reset attempts.
          metricLabel: Severity
          metricValue: High
          status: warning
    body: Review the open items.
    prompt: Which action is safest?
    passNext: done
    failNext: done
    options:
      - id: investigate
        label: Investigate the queue item
        correct: true
      - id: ignore
        label: Ignore the warning
        correct: false
    interactions:
      - id: review-case
        type: dashboard_action_card
        optionId: investigate
        title: Review flagged case
        text: Multiple suspicious password reset attempts.
        status: warning
  - id: done
    type: result
    title: Done
    outcome: neutral
    body: Complete.
`);
  const state = initializeRuntime(course);

  const emailMarkup = renderToStaticMarkup(
    <SceneRenderer
      course={course}
      node={course.nodes["email-review"]}
      state={state}
    />
  );
  const chatMarkup = renderToStaticMarkup(
    <SceneRenderer
      course={course}
      node={course.nodes["support-chat"]}
      state={state}
    />
  );
  const dashboardMarkup = renderToStaticMarkup(
    <SceneRenderer
      course={course}
      node={course.nodes["dashboard-review"]}
      state={state}
    />
  );

  assert.match(emailMarkup, /scene-shell-email/);
  assert.match(emailMarkup, /Urgent password reset required/);
  assert.match(emailMarkup, /Report phishing/);
  assert.match(emailMarkup, /password-reset\.html/);

  assert.match(chatMarkup, /scene-shell-chat/);
  assert.match(chatMarkup, /Support conversation/);
  assert.match(chatMarkup, /I still need help/);
  assert.match(chatMarkup, /Acknowledge and clarify/);

  assert.match(dashboardMarkup, /scene-shell-dashboard/);
  assert.match(dashboardMarkup, /Compliance review/);
  assert.match(dashboardMarkup, /Escalations/);
  assert.match(dashboardMarkup, /Review flagged case/);
});
