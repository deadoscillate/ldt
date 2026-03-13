import { BRAND } from "@/lib/app/brand";

export const featureCards = [
  {
    title: "Structured course definitions",
    description:
      "Define course logic, scene shells, and reusable content as readable source instead of fragile exports.",
  },
  {
    title: "Reusable module libraries",
    description: "Reuse scenarios, lessons, and checks across course families.",
  },
  {
    title: "SCORM compilation",
    description: "Compile validated source into deployable SCORM 1.2 packages.",
  },
  {
    title: "Version-controlled training systems",
    description:
      "Keep source, tests, themes, and builds organized like software projects.",
  },
] as const;

export const conceptCards = [
  {
    title: "Structured Authoring",
    description: "Define training content as structured source instead of slide decks.",
  },
  {
    title: "Reusable Modules",
    description: "Build libraries of knowledge checks, scenarios, and lessons.",
  },
  {
    title: "Reproducible Builds",
    description: "Compile consistent SCORM packages every time.",
  },
] as const;

export const audienceCards = [
  "Instructional designers building branching scenario training.",
  "Training consultants producing repeatable SCORM content.",
  "Technical L&D teams who want structured authoring instead of manual branching assembly.",
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
  "Compiled preview and SCORM packages are generated from validated source.",
  "Templates and variables make repeated course families faster to ship.",
  "Plain-text source works naturally with Git, review, and version history.",
] as const;

export const sharedModuleExamplePoints = [
  "One phishing intro module can appear in K-12, healthcare, and enterprise variants.",
  "A shared reporting procedure can drive multiple conduct-reporting course families.",
  "Module changes flow into dependency graphs, affected rebuilds, and logic-test runs.",
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
  problemTitle: "Training logic is still too manual in traditional builders",
  problemBody:
    "Many teams still manage branching logic through duplicated screens, repeated manual edits, and exports that are hard to review or rebuild.",
  solutionTitle: "Define source once, then compile preview and SCORM output",
  solutionBody:
    "Sapio Forge keeps course source readable, reusable, and versionable, then compiles that same definition into browser preview and SCORM build artifacts.",
} as const;

export const structuredAuthoringIntro =
  "Instead of building courses as slide decks, Sapio Forge treats training modules as structured source. This allows teams to version, reuse, test, and compile learning systems the same way developers build software.";

export const sharedModulesIntro =
  "Sapio Forge treats intros, reminders, reporting steps, and scenario fragments like reusable source modules. One source change can then flow through affected rebuilds instead of forcing teams to manually update separate course copies.";

export const comparisonIntro = `${BRAND.productName} is not a Storyline clone or a presentation builder. It is for teams that want training systems to be maintainable, reusable, and buildable from source.`;
