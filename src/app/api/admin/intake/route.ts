import { NextResponse } from "next/server";

import {
  getAdminTokenFromRequest,
  isAdminAccessAvailable,
  isAdminTokenValid,
} from "@/lib/intake/admin-auth";
import {
  buildIntakeExportFileName,
  getIntakeExportContentType,
  serializeIntakeEntries,
  type IntakeExportFormat,
} from "@/lib/intake/export";
import { INTAKE_KINDS, listIntakeEntries, type IntakeKind } from "@/lib/intake/store";

function validateKind(value: string | null): IntakeKind {
  if (value && INTAKE_KINDS.includes(value as IntakeKind)) {
    return value as IntakeKind;
  }

  return "waitlist";
}

function validateFormat(value: string | null): IntakeExportFormat {
  return value === "csv" ? "csv" : "json";
}

export async function GET(request: Request) {
  if (!isAdminAccessAvailable()) {
    return NextResponse.json(
      { error: "ADMIN_EXPORT_TOKEN is not configured." },
      { status: 503 }
    );
  }

  if (!isAdminTokenValid(getAdminTokenFromRequest(request))) {
    return NextResponse.json(
      { error: "Admin export access is not authorized." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const kind = validateKind(url.searchParams.get("kind"));
  const format = validateFormat(url.searchParams.get("format"));

  try {
    const { backend, entries } = await listIntakeEntries(kind);
    const body = serializeIntakeEntries(kind, format, entries);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": getIntakeExportContentType(format),
        "Content-Disposition": `attachment; filename="${buildIntakeExportFileName(
          kind,
          format
        )}"`,
        "X-Intake-Backend": backend,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The intake export could not be generated.",
      },
      { status: 500 }
    );
  }
}
