import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { ServiceClientError } from "../clients/internal-http-client.js";

export function mapServiceError(error: unknown): never {
  if (error instanceof ServiceClientError) {
    throw new TRPCError({
      code: trpcCodeForStatus(error.statusCode),
      message: error.message,
      cause: error
    });
  }

  throw error;
}

export function requireAuthorizationHeader(header: string | null): string {
  if (!header) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing access token"
    });
  }

  return header;
}

function trpcCodeForStatus(statusCode: number): TRPC_ERROR_CODE_KEY {
  if (statusCode === 400) {
    return "BAD_REQUEST";
  }
  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }
  if (statusCode === 403) {
    return "FORBIDDEN";
  }
  if (statusCode === 404) {
    return "NOT_FOUND";
  }
  if (statusCode === 409) {
    return "CONFLICT";
  }
  if (statusCode === 422) {
    return "BAD_REQUEST";
  }
  if (statusCode === 501 || statusCode === 503) {
    return "INTERNAL_SERVER_ERROR";
  }

  return "INTERNAL_SERVER_ERROR";
}
