import { createHash } from "node:crypto";

export const AUTH_COOKIE_NAME = "ravenform_session";

const DEFAULT_COOKIE_PATH = "/";

function serializeCookie(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("; ");
}

export function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

export function parseCookies(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((accumulator, cookiePart) => {
    const [rawName, ...rawValue] = cookiePart.trim().split("=");

    if (!rawName) {
      return accumulator;
    }

    accumulator[rawName] = decodeURIComponent(rawValue.join("="));
    return accumulator;
  }, {});
}

export function getSessionTokenFromCookieHeader(cookieHeader?: string | null) {
  const cookies = parseCookies(cookieHeader);
  return cookies[AUTH_COOKIE_NAME] ?? null;
}

export function createSessionCookie(sessionToken: string, expiresAt: Date) {
  return serializeCookie([
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${DEFAULT_COOKIE_PATH}`,
    `Expires=${expiresAt.toUTCString()}`,
  ]);
}

export function createExpiredSessionCookie() {
  return serializeCookie([
    `${AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${DEFAULT_COOKIE_PATH}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ]);
}
