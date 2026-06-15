import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError, ErrorCode } from "@actiondesk/errors";
import type { ServiceEnv } from "../../foundation/env.js";

export type AccessTokenClaims = {
  userId: string;
  workspaceId: string;
  sessionId: string;
};

type StoredAccessPayload = {
  sub: string;
  workspaceId: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export function createAccessToken(claims: AccessTokenClaims, env: ServiceEnv): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: StoredAccessPayload = {
    sub: claims.userId,
    workspaceId: claims.workspaceId,
    sessionId: claims.sessionId,
    iat: now,
    exp: now + env.AUTH_ACCESS_TOKEN_TTL_SECONDS
  };

  return signToken(payload, env.AUTH_JWT_ACCESS_SECRET);
}

export function verifyAccessToken(token: string, env: ServiceEnv): AccessTokenClaims {
  const payload = verifyToken(token, env.AUTH_JWT_ACCESS_SECRET);

  if (!payload.sub || !payload.workspaceId || !payload.sessionId) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid access token" });
  }

  return {
    userId: payload.sub,
    workspaceId: payload.workspaceId,
    sessionId: payload.sessionId
  };
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

function signToken(payload: StoredAccessPayload, secret: string): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string): StoredAccessPayload {
  const parts = token.split(".");

  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid access token" });
  }

  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parts[2]);

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Invalid access token" });
  }

  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as StoredAccessPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: "Access token expired" });
  }

  return payload;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
