export class CourseValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Course validation failed.");
    this.name = "CourseValidationError";
    this.issues = issues;
  }
}

export class CourseTemplateResolutionError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Course template resolution failed.");
    this.name = "CourseTemplateResolutionError";
    this.issues = issues;
  }
}
