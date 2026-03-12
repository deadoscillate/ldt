import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  courseSampleCatalog,
  type CourseSample,
} from "@/lib/course/sample-catalog";

export async function loadCourseSamples(): Promise<CourseSample[]> {
  return Promise.all(
    courseSampleCatalog.map(async (sample) => {
      const filePath = path.join(
        process.cwd(),
        "src",
        "samples",
        sample.fileName
      );

      return {
        ...sample,
        yaml: await readFile(filePath, "utf8"),
      };
    })
  );
}
