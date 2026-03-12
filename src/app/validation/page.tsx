import type { Metadata } from "next";

import { ValidationProofCenter } from "@/components/ValidationProofCenter";
import { loadLmsValidationCatalog } from "@/lib/validation/load";

export const metadata: Metadata = {
  title: "Validation",
  description:
    "Structured proof center for SCORM Cloud baseline validation and broader LMS interoperability tracking across Moodle, Canvas LMS, and TalentLMS.",
  openGraph: {
    title: "LDT Engine | Validation Proof Center",
    description:
      "See current SCORM validation status, tested behaviors, and platform-specific LMS proof records for LDT Engine.",
    type: "website",
    siteName: "LDT Engine",
  },
};

export default async function ValidationPage() {
  const catalog = await loadLmsValidationCatalog();

  return <ValidationProofCenter catalog={catalog} />;
}
