import assert from "node:assert/strict";
import test from "node:test";

import { loadTemplatePacks } from "@/lib/course/load-template-packs";
import { runCoursePipeline } from "@/lib/course/pipeline";
import {
  parseTemplateVariableSchemaYaml,
  validateTemplateVariableValues,
} from "@/lib/course/template-variables";

test("template packs load metadata, templates, and variants from source files", async () => {
  const packs = await loadTemplatePacks();

  assert.ok(packs.length >= 3);

  const securityPack = packs.find((pack) => pack.id === "security-awareness");
  assert.ok(securityPack);
  assert.equal(securityPack.templates.length, 2);
  assert.equal(securityPack.templates[0]?.variableSchema.variables.courseTitle?.inputType, "text");
  assert.equal(
    securityPack.templates[0]?.variableSchema.variables.policyUrl?.inputType,
    "url"
  );
  assert.ok(
    securityPack.templates.some((template) => template.variants.length >= 2)
  );
});

test("variable schemas make missing, invalid, and unknown values explicit", () => {
  const variableSchema = parseTemplateVariableSchemaYaml(`
variables:
  companyName:
    type: text
  escalationEmail:
    type: email
`);

  const result = validateTemplateVariableValues(
    {
      escalationEmail: "not-an-email",
      unexpected: "value",
    },
    variableSchema
  );

  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Template variable "companyName" is required.')
    )
  );
  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Template variable "escalationEmail" must be a valid email address.')
    )
  );
  assert.ok(
    result.issues.some((issue) =>
      issue.includes('Template variable "unexpected" is not declared')
    )
  );
});

test("template pack variants compile successfully through the shared pipeline", async () => {
  const packs = await loadTemplatePacks();

  packs.forEach((pack) => {
    pack.templates.forEach((template) => {
      template.variants.forEach((variant) => {
        const snapshot = runCoursePipeline(template.yaml, {
          templateDataOverrides: variant.values,
          variableSchema: template.variableSchema,
        });

        assert.equal(
          snapshot.failedStageId,
          null,
          `${pack.id}/${template.id}/${variant.id}: ${snapshot.errors.join("; ")}`
        );
        assert.ok(snapshot.canonicalCourse, `${pack.id}/${template.id}/${variant.id}`);
      });
    });
  });
});
