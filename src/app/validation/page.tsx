import type { Metadata } from "next";

import { ValidationProofCenter } from "@/components/ValidationProofCenter";
import { BRAND, buildBrandTitle } from "@/lib/app/brand";
import { loadLmsValidationCatalog } from "@/lib/validation/load";

export const metadata: Metadata = {
  title: "Validation Proof Center",
  description:
    "Sapio Forge proof center for SCORM Cloud baseline validation and broader LMS interoperability tracking across Moodle, Canvas LMS, and TalentLMS.",
  openGraph: {
    title: buildBrandTitle("Validation Proof Center"),
    description:
      "See current SCORM validation status, tested behaviors, and platform-specific LMS proof records for Sapio Forge.",
    type: "website",
    siteName: BRAND.productName,
  },
};

export default async function ValidationPage() {
  const catalog = await loadLmsValidationCatalog();

  return <ValidationProofCenter catalog={catalog} />;
}
