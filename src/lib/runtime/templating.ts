import type { CompiledCourse } from "@/lib/course/types";
import type { RuntimeState } from "@/lib/runtime/types";

export function renderTemplatedText(
  value: string,
  course: CompiledCourse,
  state: RuntimeState
): string {
  const percent =
    course.maxScore > 0 ? Math.round((state.score / course.maxScore) * 100) : 0;

  const tokens: Record<string, string> = {
    courseTitle: course.title,
    score: String(state.score),
    maxScore: String(course.maxScore),
    passingScore: String(course.passingScore),
    percent: String(percent),
    ...Object.fromEntries(
      Object.entries(state.scenarioState ?? {}).map(([key, value]) => [
        key,
        String(value),
      ])
    ),
  };

  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return tokens[key] ?? match;
  });
}
