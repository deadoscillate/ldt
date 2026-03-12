function normalizeToken(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function isAdminTokenConfigured(): boolean {
  return Boolean(normalizeToken(process.env.ADMIN_EXPORT_TOKEN));
}

export function isAdminAccessAvailable(): boolean {
  return process.env.NODE_ENV !== "production" || isAdminTokenConfigured();
}

export function isAdminTokenValid(token: string | null | undefined): boolean {
  const expectedToken = normalizeToken(process.env.ADMIN_EXPORT_TOKEN);

  if (!expectedToken) {
    return process.env.NODE_ENV !== "production";
  }

  return normalizeToken(token) === expectedToken;
}

export function getAdminTokenFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return normalizeToken(
    url.searchParams.get("token") ?? request.headers.get("x-admin-token")
  );
}

export function getAdminTokenFromSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return normalizeToken(value[0]);
  }

  return normalizeToken(value);
}
