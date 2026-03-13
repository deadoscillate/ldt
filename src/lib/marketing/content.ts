import { BRAND } from "@/lib/app/brand";

export const featureCards = [
  {
    title: "Structured course files",
    description:
      "Write course content and logic as readable source instead of rebuilding the same screens by hand.",
  },
  {
    title: "Reusable module libraries",
    description: "Reuse intros, lessons, and checks across many courses.",
  },
  {
    title: "Reliable SCORM export",
    description: "Turn validated source into SCORM 1.2 packages you can test and deliver.",
  },
  {
    title: "Version-friendly workflow",
    description:
      "Keep source, tests, themes, and builds organized in a way teams can review and reuse.",
  },
] as const;

export const conceptCards = [
  {
    title: "Structured Authoring",
    description: "Write training content as structured source instead of slide decks.",
  },
  {
    title: "Reusable Modules",
    description: "Reuse lessons, checks, and scenarios across more than one course.",
  },
  {
    title: "Reproducible Builds",
    description: "Generate the same SCORM package from the same source every time.",
  },
] as const;

export const audienceCards = [
  "Instructional designers building branching scenario training.",
  "Training consultants producing repeatable SCORM content.",
  "Technical L&D teams who want a clearer workflow than manual branching and duplicated slides.",
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
  "Readable YAML source files stay as the system of record.",
  "Preview and SCORM output are generated from validated source.",
  "Templates and variables make repeated course families faster to create.",
  "Plain-text source works naturally with Git, review, and version history.",
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
    "Sapio Forge keeps course source readable and reusable, then turns that same definition into a browser preview and SCORM build.",
} as const;

export const structuredAuthoringIntro =
  "Instead of building courses as slide decks, Sapio Forge treats training modules as structured source. Teams can reuse, test, review, and export them with a workflow that feels much more reliable.";

export const sharedModulesIntro =
  "Sapio Forge treats intros, reminders, reporting steps, and scenario fragments as reusable modules. One source change can then update the right builds instead of forcing manual copy-and-paste edits.";

export const comparisonIntro = `${BRAND.productName} is not a slide editor. It is for teams that want training content to stay readable, reusable, and easy to rebuild from source.`;
