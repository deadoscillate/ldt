import { BRAND } from "@/lib/app/brand";

interface WaitlistConfirmationResult {
  enabled: boolean;
  sent: boolean;
  error?: string;
}

function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendWaitlistConfirmationEmail(
  email: string
): Promise<WaitlistConfirmationResult> {
  if (!isEmailConfigured()) {
    return {
      enabled: false,
      sent: false,
    };
  }

  const studioUrl = new URL("/studio", getBaseUrl()).toString();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email],
        subject: `${BRAND.productName} beta access`,
        text: [
          `Thanks for joining the ${BRAND.productName} early access list.`,
          `Open the studio: ${studioUrl}`,
          "Early feedback is welcome as you test the current beta workflow.",
        ].join("\n\n"),
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      return {
        enabled: true,
        sent: false,
        error: body || "The confirmation email request failed.",
      };
    }

    return {
      enabled: true,
      sent: true,
    };
  } catch (error) {
    return {
      enabled: true,
      sent: false,
      error:
        error instanceof Error
          ? error.message
          : "The confirmation email request failed.",
    };
  }
}
