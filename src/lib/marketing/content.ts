import { BRAND } from "@/lib/app/brand";

export const featureCards = [
  {
    title: "One training flow to update",
    description:
      "Keep steps, choices, and scoring in one place instead of duplicating slide screens.",
  },
  {
    title: "Reuse what repeats",
    description:
      "Reuse intros, checks, reminders, and procedures across more than one lesson.",
  },
  {
    title: "Preview before you export",
    description:
      "Check the learner experience before you generate a SCORM package.",
  },
  {
    title: "Keep projects easier to maintain",
    description:
      "Update shared content once and rebuild with fewer hand edits across course families.",
  },
] as const;

export const conceptCards = [
  {
    title: "Structured Authoring",
    description:
      "Build the lesson as one clear training flow instead of copying slide branches.",
  },
  {
    title: "Reusable Modules",
    description:
      "Reuse lessons, checks, and scenario blocks across teams, clients, and departments.",
  },
  {
    title: "Reproducible Builds",
    description:
      "Preview, validate, and export the same training flow with fewer last-minute surprises.",
  },
] as const;

export const audienceCards = [
  "Instructional designers who need branching scenarios without maintaining a web of duplicated slides.",
  "Training teams who update the same policy, process, or scenario across multiple lessons.",
  "More technical L&D teams who want reusable modules, cleaner review, and dependable SCORM builds.",
] as const;

export const comparisonRows = [
  {
    label: "Flow design",
    thisTool: "One structured training flow",
    traditional: "Duplicated slide branches",
  },
  {
    label: "Reuse",
    thisTool: "Shared modules and templates",
    traditional: "Manual copy and paste",
  },
  {
    label: "Preview",
    thisTool: "Check it before export",
    traditional: "Problems found late",
  },
  {
    label: "Updates",
    thisTool: "Change shared content once",
    traditional: "Edit many screens by hand",
  },
] as const;

export const structuredAuthoringPoints = [
  "The training flow stays readable instead of hiding logic in duplicated screens.",
  "Guided editing, preview, and export all work from the same lesson definition.",
  "Templates and shared modules make repeated course families faster to update.",
  "Source editing is available when a team wants deeper control, but it is not required to get started.",
] as const;

export const sharedModuleExamplePoints = [
  "One phishing intro can appear in K-12, healthcare, and enterprise variants.",
  "One reporting procedure can support multiple workplace conduct lessons.",
  "One shared update can flow into multiple previews, tests, and exports.",
] as const;

export const roadmapItems = [
  "Broader LMS validation beyond SCORM Cloud.",
  "Faster and clearer authoring inside the studio.",
  "Stronger reusable templates and module workflows.",
  "More dependable validation and export workflows.",
] as const;

export const recentProgressItems = [
  "SCORM Cloud validation completed for launch, completion, score, pass/fail, and resume.",
  "Starter templates and guided editing were tightened for first-time instructional designers.",
  "Reusable modules, shells, and scenario workflows were expanded inside the studio.",
] as const;

export const productProblemCopy = {
  problemTitle: "Slide-based branching gets messy fast",
  problemBody:
    "Many teams still manage branching through duplicated screens, repeated edits, and exports that are hard to trust when something changes.",
  solutionTitle: "Build it once, then preview and export with confidence",
  solutionBody:
    "Sapio Forge keeps the lesson flow in one place, then turns that same definition into a learner preview and a SCORM package.",
} as const;

export const structuredAuthoringIntro =
  "Instead of spreading branching across duplicated screens, Sapio Forge keeps the lesson in one structured flow. Teams can update it once, preview it quickly, and export it with much less cleanup.";

export const sharedModulesIntro =
  "Sapio Forge treats intros, reminders, reporting steps, and scenario fragments as reusable blocks. One change can then update the right lessons instead of forcing manual copy-and-paste edits.";

export const comparisonIntro = `${BRAND.productName} is for teams that want training flows to stay readable, reusable, and easier to update instead of spreading branching across duplicated screens.`;
