import assert from "node:assert/strict";
import test from "node:test";

import { parseAndCompileCourse } from "@/lib/course/parse";
import {
  advanceContentNode,
  applyChoiceSelection,
  getCurrentNode,
  initializeRuntime,
  resolveNodeInteraction,
  submitQuizAnswer,
} from "@/lib/runtime/engine";

test("runtime branching and scoring still work with scene-enhanced compiled nodes", () => {
  const course = parseAndCompileCourse(`
id: runtime-scene-compatibility
title: Runtime Scene Compatibility
start: intro
passingScore: 5
nodes:
  - id: intro
    type: content
    title: Welcome
    body: Start here.
    next: quiz
  - id: quiz
    type: quiz
    title: Question
    question: Which response is safest?
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: failed
    options:
      - id: safe
        label: Report the email
        correct: true
      - id: unsafe
        label: Click the link
        correct: false
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

  const advancedState = advanceContentNode(course, initializeRuntime(course));
  assert.equal(advancedState.currentNodeId, "quiz");

  const completedState = submitQuizAnswer(course, advancedState, ["safe"]);
  assert.equal(completedState.currentNodeId, "passed");
  assert.equal(completedState.score, 5);
  assert.equal(completedState.completed, true);
  assert.equal(getCurrentNode(course, completedState).scene.layout, "result_shell");
});

test("runtime logic stays deterministic when nodes use simulation shells", () => {
  const course = parseAndCompileCourse(`
id: runtime-shell-compatibility
title: Runtime Shell Compatibility
start: inbox
passingScore: 5
nodes:
  - id: inbox
    type: content
    shell: email_shell
    title: Inbox review
    email:
      from: IT Support
      subject: Urgent password reset required
      previewText: Account expires today.
    body: Review the email and continue.
    next: triage
  - id: triage
    type: question
    shell: dashboard_shell
    title: Review the case
    dashboard:
      title: Security triage
      notice: Investigate the flagged request before closing it.
      navItems:
        - Queue
        - Escalations
      cards:
        - title: Flagged request
          text: Multiple urgent reset requests were sent overnight.
          metricLabel: Severity
          metricValue: High
          status: warning
    prompt: Which response is safest?
    correctScore: 5
    incorrectScore: 0
    passNext: passed
    failNext: failed
    options:
      - id: safe
        label: Investigate and report the request
        correct: true
      - id: unsafe
        label: Close the ticket and ignore the signs
        correct: false
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

  const advancedState = advanceContentNode(course, initializeRuntime(course));
  const quizNode = getCurrentNode(course, advancedState);

  assert.equal(quizNode.id, "triage");
  assert.equal(quizNode.scene.layout, "dashboard_shell");

  const completedState = submitQuizAnswer(course, advancedState, ["safe"]);

  assert.equal(completedState.currentNodeId, "passed");
  assert.equal(completedState.score, 5);
  assert.equal(completedState.completed, true);
});

test("runtime resolves shell interaction ids back to canonical option ids", () => {
  const course = parseAndCompileCourse(`
id: runtime-shell-interaction-check
title: Runtime Shell Interaction Check
start: inbox
nodes:
  - id: inbox
    type: choice
    shell: email_shell
    title: Inbox review
    email:
      from: IT Support
      subject: Urgent password reset required
    body: Choose the safest action.
    options:
      - id: report
        label: Report phishing
        next: passed
        score: 0
      - id: open
        label: Open attachment
        next: failed
        score: 0
    interactions:
      - id: report-button
        type: email_action_button
        optionId: report
        label: Report phishing
      - id: open-attachment
        type: email_attachment
        optionId: open
        label: Open attachment
        fileName: password-reset.html
  - id: passed
    type: result
    title: Passed
    outcome: passed
    body: Done.
  - id: failed
    type: result
    title: Failed
    outcome: failed
    body: Done.
`);

  const resolved = resolveNodeInteraction(course.nodes.inbox, "report-button");

  assert.deepEqual(resolved, {
    interactionId: "report-button",
    optionId: "report",
    actionMode: "trigger",
    feedback: "",
    correct: null,
    scoreDelta: 0,
    nextNodeId: "passed",
  });
});

test("runtime preserves scenario state across scenes and routes by prior actions", () => {
  const course = parseAndCompileCourse(`
id: runtime-stateful-scenario
title: Runtime Stateful Scenario
start: intro
state:
  reportedPhishing:
    type: boolean
    initial: false
  openedAttachment:
    type: boolean
    initial: false
nodes:
  - id: intro
    type: content
    title: Intro
    body: Start the inbox simulation.
    next: inspect
  - id: inspect
    type: choice
    title: Inspect
    body: Choose the next action.
    options:
      - id: report
        label: Report the email
        next: follow-up
        score: 0
        stateUpdates:
          - variable: reportedPhishing
            set: true
      - id: open
        label: Open the attachment
        next: follow-up
        score: 0
        stateUpdates:
          - variable: openedAttachment
            set: true
  - id: follow-up
    type: content
    title: Follow-up
    body: The next result depends on the earlier action.
    next: passed
    nextWhen:
      - when:
          - variable: openedAttachment
            equals: true
        next: failed
  - id: passed
    type: result
    title: Passed
    outcome: passed
    body: Safe path.
  - id: failed
    type: result
    title: Failed
    outcome: failed
    body: Unsafe path.
`);

  const introState = initializeRuntime(course);
  const choiceState = advanceContentNode(course, introState);
  const followUpState = applyChoiceSelection(course, choiceState, "open");

  assert.equal(followUpState.scenarioState.reportedPhishing, false);
  assert.equal(followUpState.scenarioState.openedAttachment, true);
  assert.equal(followUpState.currentNodeId, "follow-up");

  const resultState = advanceContentNode(course, followUpState);

  assert.equal(resultState.currentNodeId, "failed");
  assert.equal(resultState.completed, true);
});
