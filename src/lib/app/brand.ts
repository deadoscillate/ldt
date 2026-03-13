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
    "Sapio Forge is a structured learning platform that lets teams define training modules as source, compile them into SCORM packages, and deploy them to any LMS.",
  longDescription:
    "Sapio Forge replaces slide-based course builders with structured authoring, reusable modules, and reproducible SCORM builds for training content.",
  heroSubheadline:
    "Start from a template, edit in guided forms or source, preview the learner experience, and export SCORM packages for any LMS.",
  metaDescription:
    "Structured authoring, reusable modules, and reproducible SCORM builds for modern training systems.",
  landingValueProp:
    "Define training modules as structured source, preview them in the browser, and export SCORM packages for any LMS.",
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
