import type { FastifyRequest } from "fastify";

export type AuthContext = {
  accessToken: string | null;
  authorizationHeader: string | null;
  refreshToken: string | null;
  userId: string | null;
  workspaceId: string | null;
};

const accessCookieName = "actiondesk_access_token";
const refreshCookieName = "actiondesk_refresh_token";

export function createAuthContext(request: FastifyRequest): AuthContext {
  const authorization = request.headers.authorization;
  const authorizationHeader = Array.isArray(authorization) ? authorization[0] : authorization;
  const cookieHeader = Array.isArray(request.headers.cookie)
    ? request.headers.cookie[0]
    : request.headers.cookie;
  const cookieAccessToken = readCookie(cookieHeader, accessCookieName);
  const accessToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : cookieAccessToken;
  const resolvedAuthorization = authorizationHeader ?? (accessToken ? `Bearer ${accessToken}` : null);

  return {
    accessToken,
    authorizationHeader: resolvedAuthorization,
    refreshToken: readCookie(cookieHeader, refreshCookieName),
    userId: null,
    workspaceId: null
  };
}

export function sessionCookieHeaders(session: { accessToken: string; refreshToken: string }): string[] {
  return [
    serializeCookie(accessCookieName, session.accessToken, { httpOnly: true }),
    serializeCookie(refreshCookieName, session.refreshToken, { httpOnly: true })
  ];
}

export function clearSessionCookieHeaders(): string[] {
  return [
    serializeCookie(accessCookieName, "", { httpOnly: true, maxAge: 0 }),
    serializeCookie(refreshCookieName, "", { httpOnly: true, maxAge: 0 })
  ];
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const pairs = cookieHeader.split(";").map((part) => part.trim());

  for (const pair of pairs) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function serializeCookie(
  name: string,
  value: string,
  options: { httpOnly: boolean; maxAge?: number }
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    options.httpOnly ? "HttpOnly" : ""
  ].filter(Boolean);

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  return parts.join("; ");
}
