import type { CompiledCourse } from "@/lib/course/types";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

export function buildScormManifest(course: CompiledCourse): string {
  const normalizedId = normalizeIdentifier(course.id);
  const title = xmlEscape(course.title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest
  identifier="MANIFEST-${normalizedId}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 ims_cp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd"
>
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-${normalizedId}">
    <organization identifier="ORG-${normalizedId}">
      <title>${title}</title>
      <item identifier="ITEM-${normalizedId}" identifierref="RES-${normalizedId}">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource
      identifier="RES-${normalizedId}"
      type="webcontent"
      adlcp:scormtype="sco"
      href="index.html"
    >
      <file href="index.html" />
      <file href="assets/runtime.css" />
      <file href="assets/runtime.js" />
      <file href="assets/course.json" />
    </resource>
  </resources>
</manifest>
`;
}
