import assert from "node:assert/strict";
import test from "node:test";

import {
  builderCourseToYaml,
  compiledCourseToBuilderCourse,
  createEmptyBuilderCourse,
  type BuilderCourse,
} from "@/lib/course/builder";
import { parseAndCompileCourse } from "@/lib/course/parse";

test("builder courses serialize to structured YAML that compiles successfully", () => {
  const builderCourse: BuilderCourse = {
    id: "guided-course",
    title: "Guided Course",
    description: "Built through forms.",
    start: "intro",
    passingScore: "7",
    theme: {
      primary: "#1f6feb",
      secondary: "#f3f6fb",
      font: "Inter",
      logo: "https://example.com/logo.png",
      background: "#ffffff",
    },
    nodes: [
      {
        id: "intro",
        type: "content",
        title: "Welcome",
        body: "Start the scenario.",
        layout: "image-right",
        next: "question-1",
        prompt: "",
        multiple: false,
        correctScore: "10",
        incorrectScore: "0",
        passNext: "",
        failNext: "",
        outcome: "neutral",
        mediaType: "image",
        mediaSrc: "https://example.com/phishing.png",
        mediaAlt: "Suspicious email",
        mediaCaption: "Sample message",
        leftTitle: "Watch for these signs",
        leftText: "Unexpected links and urgent language.",
        leftImage: "",
        leftVideo: "",
        rightTitle: "",
        rightText: "",
        rightImage: "",
        rightVideo: "",
        quoteText: "",
        quoteAttribution: "",
        calloutTitle: "",
        calloutText: "",
        options: [],
      },
      {
        id: "question-1",
        type: "question",
        title: "Knowledge check",
        body: "Choose the best answer.",
        layout: "question",
        next: "",
        prompt: "Which signal is most suspicious?",
        multiple: false,
        correctScore: "7",
        incorrectScore: "0",
        passNext: "passed",
        failNext: "failed",
        outcome: "neutral",
        mediaType: "image",
        mediaSrc: "",
        mediaAlt: "",
        mediaCaption: "",
        leftTitle: "",
        leftText: "",
        leftImage: "",
        leftVideo: "",
        rightTitle: "",
        rightText: "",
        rightImage: "",
        rightVideo: "",
        quoteText: "",
        quoteAttribution: "",
        calloutTitle: "",
        calloutText: "",
        options: [
          {
            id: "urgent-reset",
            label: "Urgent password reset request",
            next: "",
            score: "0",
            correct: true,
          },
          {
            id: "newsletter",
            label: "Monthly newsletter",
            next: "",
            score: "0",
            correct: false,
          },
        ],
      },
      {
        id: "passed",
        type: "result",
        title: "Passed",
        body: "You passed with {{score}} points.",
        layout: "result",
        next: "",
        prompt: "",
        multiple: false,
        correctScore: "10",
        incorrectScore: "0",
        passNext: "",
        failNext: "",
        outcome: "passed",
        mediaType: "image",
        mediaSrc: "",
        mediaAlt: "",
        mediaCaption: "",
        leftTitle: "",
        leftText: "",
        leftImage: "",
        leftVideo: "",
        rightTitle: "",
        rightText: "",
        rightImage: "",
        rightVideo: "",
        quoteText: "",
        quoteAttribution: "",
        calloutTitle: "",
        calloutText: "Generated from the builder.",
        options: [],
      },
      {
        id: "failed",
        type: "result",
        title: "Failed",
        body: "Review and try again.",
        layout: "callout",
        next: "",
        prompt: "",
        multiple: false,
        correctScore: "10",
        incorrectScore: "0",
        passNext: "",
        failNext: "",
        outcome: "failed",
        mediaType: "image",
        mediaSrc: "",
        mediaAlt: "",
        mediaCaption: "",
        leftTitle: "",
        leftText: "",
        leftImage: "",
        leftVideo: "",
        rightTitle: "",
        rightText: "",
        rightImage: "",
        rightVideo: "",
        quoteText: "",
        quoteAttribution: "",
        calloutTitle: "Try again",
        calloutText: "Generated from the builder.",
        options: [],
      },
    ],
  };

  const yaml = builderCourseToYaml(builderCourse);
  const compiledCourse = parseAndCompileCourse(yaml);

  assert.equal(compiledCourse.id, "guided-course");
  assert.equal(compiledCourse.theme.primary, "#1f6feb");
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
  assert.equal(builderCourse.nodes[0]?.id, "intro");
  assert.equal(builderCourse.nodes[1]?.type, "result");
});
