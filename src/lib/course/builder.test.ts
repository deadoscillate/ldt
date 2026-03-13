import assert from "node:assert/strict";
import test from "node:test";

import {
  builderCourseToYaml,
  compiledCourseToBuilderCourse,
  createEmptyBuilderCourse,
  createEmptyBuilderNode,
  type BuilderCourse,
} from "@/lib/course/builder";
import { parseAndCompileCourse } from "@/lib/course/parse";

test("builder courses serialize to structured YAML that compiles successfully", () => {
  const introNode = createEmptyBuilderNode(0, "content");
  introNode.id = "intro";
  introNode.title = "Welcome";
  introNode.body = "Start the scenario.";
  introNode.layout = "image-right";
  introNode.next = "question-1";
  introNode.mediaSrc = "https://example.com/phishing.png";
  introNode.mediaAlt = "Suspicious email";
  introNode.mediaCaption = "Sample message";
  introNode.leftTitle = "Watch for these signs";
  introNode.leftText = "Unexpected links and urgent language.";

  const questionNode = createEmptyBuilderNode(1, "question");
  questionNode.id = "question-1";
  questionNode.title = "Knowledge check";
  questionNode.body = "Choose the best answer.";
  questionNode.layout = "question";
  questionNode.prompt = "Which signal is most suspicious?";
  questionNode.correctScore = "7";
  questionNode.passNext = "passed";
  questionNode.failNext = "failed";
  questionNode.options = [
    {
      id: "urgent-reset",
      label: "Urgent password reset request",
      next: "",
      score: "0",
      correct: true,
      stateUpdates: [],
      nextWhen: [],
    },
    {
      id: "newsletter",
      label: "Monthly newsletter",
      next: "",
      score: "0",
      correct: false,
      stateUpdates: [],
      nextWhen: [],
    },
  ];

  const passedNode = createEmptyBuilderNode(2, "result");
  passedNode.id = "passed";
  passedNode.title = "Passed";
  passedNode.body = "You passed with {{score}} points.";
  passedNode.layout = "result";
  passedNode.outcome = "passed";
  passedNode.calloutText = "Generated from the builder.";

  const failedNode = createEmptyBuilderNode(3, "result");
  failedNode.id = "failed";
  failedNode.title = "Failed";
  failedNode.body = "Review and try again.";
  failedNode.layout = "callout";
  failedNode.outcome = "failed";
  failedNode.calloutTitle = "Try again";
  failedNode.calloutText = "Generated from the builder.";

  const builderCourse: BuilderCourse = {
    id: "guided-course",
    title: "Guided Course",
    description: "Built through forms.",
    start: "intro",
    passingScore: "7",
    stateVariables: [
      {
        id: "reportedPhishing",
        type: "boolean",
        initial: "false",
        description: "Tracks whether the learner reported the email.",
        optionsText: "",
      },
    ],
    nodes: [introNode, questionNode, passedNode, failedNode],
  };

  const yaml = builderCourseToYaml(builderCourse);
  const compiledCourse = parseAndCompileCourse(yaml);

  assert.equal(compiledCourse.id, "guided-course");
  assert.equal(compiledCourse.theme.primary, null);
  assert.equal(compiledCourse.nodes.intro.layout, "image-right");
  assert.equal(compiledCourse.nodes["question-1"].sourceType, "question");
  assert.equal(compiledCourse.nodes["question-1"].type, "quiz");
  assert.equal(compiledCourse.nodes.passed.layout, "result");
  assert.equal(compiledCourse.nodes.failed.callout?.title, "Try again");
});

test("compiled courses can be mapped back into builder form", () => {
  const compiledCourse = parseAndCompileCourse(
    builderCourseToYaml(createEmptyBuilderCourse())
  );
  const builderCourse = compiledCourseToBuilderCourse(compiledCourse);

  assert.equal(builderCourse.id, "new-training-course");
  assert.equal(builderCourse.start, "intro");
  assert.equal(builderCourse.stateVariables.length, 0);
  assert.equal(builderCourse.nodes[0]?.id, "intro");
  assert.equal(builderCourse.nodes[1]?.type, "result");
});

test("builder courses serialize shell-specific interactions into compiled scenes", () => {
  const introNode = createEmptyBuilderNode(0, "branch");
  introNode.id = "inspect-email";
  introNode.title = "Inspect the message";
  introNode.shell = "email_shell";
  introNode.emailFrom = "IT Support";
  introNode.emailSubject = "Urgent password reset required";
  introNode.options = [
    {
      id: "inspect",
      label: "Inspect sender",
      next: "passed",
      score: "0",
      correct: false,
      stateUpdates: [],
      nextWhen: [],
    },
    {
      id: "open",
      label: "Open attachment",
      next: "failed",
      score: "0",
      correct: false,
      stateUpdates: [],
      nextWhen: [],
    },
  ];
  introNode.interactions = [
    {
      id: "inspect-sender",
      type: "email_link",
      optionId: "inspect",
      label: "Inspect sender details",
      title: "",
      text: "",
      hrefLabel: "it-support@example.com",
      fileName: "",
      variant: "primary",
      status: "neutral",
      sender: "",
      timestamp: "",
      role: "other",
      feedback: "Correct choice.",
      visibleIf: [],
    },
  ];

  const passedNode = createEmptyBuilderNode(1, "result");
  passedNode.id = "passed";
  passedNode.outcome = "passed";

  const failedNode = createEmptyBuilderNode(2, "result");
  failedNode.id = "failed";
  failedNode.outcome = "failed";

  const compiledCourse = parseAndCompileCourse(
    builderCourseToYaml({
      id: "interaction-builder-course",
      title: "Interaction Builder Course",
      description: "",
      start: "inspect-email",
      passingScore: "0",
      stateVariables: [],
      nodes: [introNode, passedNode, failedNode],
    })
  );

  assert.equal(compiledCourse.nodes["inspect-email"].interactions.length, 1);
  assert.ok(
    compiledCourse.nodes["inspect-email"].scene.components.some(
      (component) => component.type === "email_link"
    )
  );
});

test("builder courses preserve state definitions, updates, and conditional routes", () => {
  const introNode = createEmptyBuilderNode(0, "content");
  introNode.id = "intro";
  introNode.title = "Inbox";
  introNode.next = "follow-up";
  introNode.nextWhen = [
    {
      next: "failed",
      conditions: [
        {
          variable: "openedAttachment",
          operator: "equals",
          value: "true",
        },
      ],
    },
  ];

  const choiceNode = createEmptyBuilderNode(1, "choice");
  choiceNode.id = "follow-up";
  choiceNode.title = "What now?";
  choiceNode.options = [
    {
      id: "report",
      label: "Report the message",
      next: "passed",
      score: "5",
      correct: false,
      stateUpdates: [
        {
          variable: "reportedPhishing",
          mode: "set",
          value: "true",
        },
      ],
      nextWhen: [],
    },
    {
      id: "open",
      label: "Open the attachment",
      next: "failed",
      score: "0",
      correct: false,
      stateUpdates: [
        {
          variable: "openedAttachment",
          mode: "set",
          value: "true",
        },
      ],
      nextWhen: [],
    },
  ];

  const passedNode = createEmptyBuilderNode(2, "result");
  passedNode.id = "passed";
  passedNode.outcome = "passed";

  const failedNode = createEmptyBuilderNode(3, "result");
  failedNode.id = "failed";
  failedNode.outcome = "failed";

  const yaml = builderCourseToYaml({
    id: "stateful-builder-course",
    title: "Stateful Builder Course",
    description: "",
    start: "intro",
    passingScore: "5",
    stateVariables: [
      {
        id: "reportedPhishing",
        type: "boolean",
        initial: "false",
        description: "",
        optionsText: "",
      },
      {
        id: "openedAttachment",
        type: "boolean",
        initial: "false",
        description: "",
        optionsText: "",
      },
    ],
    nodes: [introNode, choiceNode, passedNode, failedNode],
  });
  const compiledCourse = parseAndCompileCourse(yaml);
  const introNodeCompiled = compiledCourse.nodes.intro;
  const followUpNodeCompiled = compiledCourse.nodes["follow-up"];

  assert.equal(
    compiledCourse.scenarioState.reportedPhishing.initialValue,
    false
  );
  assert.equal(introNodeCompiled.type, "content");
  assert.equal(introNodeCompiled.nextWhen?.[0]?.next, "failed");
  assert.equal(followUpNodeCompiled.type, "choice");
  assert.equal(
    followUpNodeCompiled.options[0]?.stateUpdates?.[0]?.variable,
    "reportedPhishing"
  );
});
