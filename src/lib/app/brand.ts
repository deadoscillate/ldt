export const BRAND = {
  productName: "Sapio Forge",
  studioName: "Sapio Forge Studio",
  cliName: "Sapio Forge CLI",
  buildName: "Sapio Forge Build",
  modulesName: "Sapio Forge Modules",
  testName: "Sapio Forge Test",
  tagline: "Build learning systems like software.",
  shortDescription: "Structured training, built from source.",
  metaTitle: "Sapio Forge - Course-as-Code Learning Platform",
  positioningStatement:
    "Sapio Forge helps teams create interactive training from structured source, preview it in the browser, and export SCORM packages for any LMS.",
  longDescription:
    "Sapio Forge replaces slide-based course tools with structured authoring, reusable modules, and reliable SCORM builds.",
  heroSubheadline:
    "Create interactive training from structured source, preview it instantly, and export SCORM for any LMS.",
  metaDescription:
    "Create interactive training from structured source with reusable modules and reliable SCORM exports.",
  landingValueProp:
    "Sapio Forge helps teams create interactive training from structured source, preview it in the browser, and export SCORM packages for any LMS.",
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
