import assert from "node:assert/strict";
import test from "node:test";

import {
  SOURCE_PROJECT_FILE_NAMES,
  buildCourseProjectReadme,
  buildSourceDownloadFileName,
  createDuplicatedTemplateDraft,
  createDuplicatedVariantDraft,
  inferCourseProjectDirectory,
  parseTemplateDataYaml,
  serializeTemplateDataYaml,
} from "@/lib/course/source-files";

test("template data YAML can be parsed and serialized for source control", () => {
  const templateData = parseTemplateDataYaml(`
courseTitle: Security Refresher
passingScore: 8
showReminder: true
`);

  assert.deepEqual(templateData, {
    courseTitle: "Security Refresher",
    passingScore: 8,
    showReminder: true,
  });

  const roundTripped = parseTemplateDataYaml(serializeTemplateDataYaml(templateData));
  assert.deepEqual(roundTripped, templateData);
});

test("template duplication produces a portable local source draft", () => {
  const draft = createDuplicatedTemplateDraft({
    courseYaml: "id: phishing-awareness\nstart: intro\nnodes: []\n",
    templateData: {
      companyName: "Example Corp",
    },
    templateTitle: "Phishing awareness",
    fallbackDirectory: "phishing-awareness-baseline",
  });

  assert.equal(draft.sourceLabel, "Local duplicate: Phishing awareness");
  assert.equal(draft.suggestedProjectDirectory, "phishing-awareness-variant");
  assert.deepEqual(draft.templateData, {
    companyName: "Example Corp",
  });
});

test("variant duplication keeps template-family values in editable source form", () => {
  const draft = createDuplicatedVariantDraft({
    variantId: "retail-support-escalation",
    variantTitle: "Retail support escalation",
    values: {
      escalationEmail: "escalations@example.com",
    },
  });

  assert.equal(draft.title, "Retail support escalation copy");
  assert.equal(draft.variantId, "retail-support-escalation-copy");
  assert.equal(draft.suggestedFileName, "retail-support-escalation-copy.yaml");
  assert.deepEqual(draft.values, {
    escalationEmail: "escalations@example.com",
  });
});

test("source helpers keep source files and build artifacts separate", () => {
  assert.deepEqual(SOURCE_PROJECT_FILE_NAMES, [
    "course.yaml",
    "template-data.yaml",
    "README.md",
  ]);
  assert.equal(
    buildSourceDownloadFileName("customer-escalation", "course"),
    "customer-escalation-course.yaml"
  );
  assert.equal(
    inferCourseProjectDirectory("id: harassment-reporting\nstart: intro\nnodes: []\n"),
    "harassment-reporting"
  );

  const readme = buildCourseProjectReadme({
    title: "Harassment reporting",
    templateName: "workplace-harassment-reporting-template",
    projectDirectory: "harassment-reporting-team-a",
  });

  assert.match(readme, /Commit these source files to Git/i);
  assert.match(readme, /Treat exported SCORM packages as build artifacts/i);
});
