import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  courseSampleCatalog,
  type CourseSample,
} from "@/lib/course/sample-catalog";

export async function loadCourseSamples(): Promise<CourseSample[]> {
  return Promise.all(
    courseSampleCatalog.map(async (sample) => {
      const templateDirectory = path.join(
        process.cwd(),
        "templates",
        sample.templateDirectory
      );
      const courseDirectory = path.join(
        process.cwd(),
        "courses",
        sample.courseDirectory
      );

      return {
        ...sample,
        yaml: await readFile(path.join(templateDirectory, "template.yaml"), "utf8"),
        templateDataYaml: await readFile(
          path.join(courseDirectory, "template-data.yaml"),
          "utf8"
        ),
        templateReadme: await readFile(
          path.join(templateDirectory, "README.md"),
          "utf8"
        ),
        templateSchemaYaml: await readFile(
          path.join(templateDirectory, "schema.yaml"),
          "utf8"
        ),
        courseReadme: await readFile(path.join(courseDirectory, "README.md"), "utf8"),
      };
    })
  );
}
