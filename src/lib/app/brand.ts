export const BRAND = {
  productName: "Sapio Forge",
  studioName: "Sapio Forge Studio",
  cliName: "Sapio Forge CLI",
  buildName: "Sapio Forge Build",
  modulesName: "Sapio Forge Modules",
  testName: "Sapio Forge Test",
  tagline: "Build learning systems like software.",
  shortDescription: "Structured learning infrastructure.",
  metaTitle: "Sapio Forge - Course-as-Code Learning Platform",
  positioningStatement:
    "Sapio Forge helps teams build branching training in one clear flow, preview it before export, and package it for any LMS.",
  longDescription:
    "Sapio Forge replaces slide-based course builders with structured authoring, reusable modules, and reproducible SCORM builds for training content.",
  heroSubheadline:
    "Start from a training template, edit the scenario in guided forms, preview the learner experience, and export a SCORM package for your LMS.",
  metaDescription:
    "Structured authoring, reusable modules, and reproducible SCORM builds for modern training systems.",
  landingValueProp:
    "Build branching training from a template, preview it in the browser, and export SCORM when it is ready.",
  contactEmail: "hello@sapioforge.app",
  githubUrl: "https://github.com/deadoscillate/ldt",
  siteUrl: "https://ldt-opccbpr6c-deadoscillates-projects.vercel.app",
} as const;

export function buildBrandTitle(section?: string | null): string {
  if (!section) {
    return BRAND.productName;
  }

  return `${BRAND.productName} | ${section}`;
}
