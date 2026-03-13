import { BRAND } from "@/lib/app/brand";

export const featureCards = [
  {
    title: "Structured course source",
    description:
      "Keep course content, branching, and scoring in readable source instead of rebuilding the same screens by hand.",
  },
  {
    title: "Reusable module libraries",
    description:
      "Reuse intros, lessons, checks, and procedures across more than one course.",
  },
  {
    title: "Reliable SCORM output",
    description:
      "Turn validated source into SCORM 1.2 packages you can preview, test, and deliver.",
  },
  {
    title: "Team-friendly workflow",
    description:
      "Keep source, tests, themes, and builds organized in a way teams can review, reuse, and rebuild.",
  },
] as const;

export const conceptCards = [
  {
    title: "Structured Authoring",
    description:
      "Define training content in a clear structure instead of duplicating slide screens.",
  },
  {
    title: "Reusable Modules",
    description:
      "Reuse lessons, checks, and scenarios across clients, departments, and course families.",
  },
  {
    title: "Reproducible Builds",
    description:
      "Generate the same SCORM package from the same source every time.",
  },
] as const;

export const audienceCards = [
  "Instructional designers who need branching scenarios without rebuilding the same screens by hand.",
  "Training consultants who need repeatable SCORM projects for different clients or departments.",
  "Technical L&D teams who want reusable source, cleaner review, and more dependable builds.",
] as const;

export const comparisonRows = [
  {
    label: "Authoring model",
    thisTool: "Structured source",
    traditional: "Slide-based authoring",
  },
  {
    label: "Reuse",
    thisTool: "Reusable modules",
    traditional: "Manual duplication",
  },
  {
    label: "Builds",
    thisTool: "Reproducible builds",
    traditional: "Fragile exports",
  },
  {
    label: "Maintenance",
    thisTool: "Version-controlled training systems",
    traditional: "Difficult to maintain at scale",
  },
] as const;

export const structuredAuthoringPoints = [
  "Course source stays readable and reviewable instead of hiding branching in duplicated screens.",
  "Preview and SCORM output come from the same validated source.",
  "Templates, saved versions, and modules make repeated course families faster to update.",
  "Plain-text source works naturally with Git when a team wants a deeper workflow.",
] as const;

export const sharedModuleExamplePoints = [
  "One phishing intro module can appear in K-12, healthcare, and enterprise variants.",
  "A shared reporting procedure can drive multiple conduct-reporting course families.",
  "One module change can update multiple builds and tests at once.",
] as const;

export const roadmapItems = [
  "Broader LMS validation beyond SCORM Cloud.",
  "Reusable template packs for common training scenarios.",
  "Improved authoring workflow inside the studio.",
  "Additional deployment hardening for production teams.",
] as const;

export const recentProgressItems = [
  "SCORM Cloud validation completed for launch, completion, score, pass/fail, and resume.",
  "Resume behavior and completion state handling were hardened for SCORM 1.2 delivery.",
  "Template-driven authoring with reusable blocks and placeholders was added to the studio.",
] as const;

export const productProblemCopy = {
  problemTitle: "Traditional course tools make branching hard to maintain",
  problemBody:
    "Many teams still manage branching through duplicated screens, repeated manual edits, and exports that are hard to review or rebuild.",
  solutionTitle: "Define it once, then preview and export from the same source",
  solutionBody:
    "Sapio Forge keeps course source readable and reusable, then turns that same definition into a learner preview and SCORM build.",
} as const;

export const structuredAuthoringIntro =
  "Instead of building courses as slide decks, Sapio Forge treats training modules as structured source. Teams can reuse, review, test, and export them with a workflow that is much easier to maintain.";

export const sharedModulesIntro =
  "Sapio Forge treats intros, reminders, reporting steps, and scenario fragments as reusable modules. One source change can then update the right builds instead of forcing manual copy-and-paste edits.";

export const comparisonIntro = `${BRAND.productName} is for teams that want training content to stay readable, reusable, and easy to rebuild from source instead of spreading course logic across duplicated screens.`;
