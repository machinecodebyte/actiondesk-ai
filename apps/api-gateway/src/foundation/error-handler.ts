import { AppError, ErrorCode, toErrorResponse } from "@actiondesk/errors";
import type { Logger } from "@actiondesk/logger";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function createErrorHandler(logger: Logger) {
  return (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const normalizedError = normalizeError(error);
    const statusCode = normalizedError instanceof AppError ? normalizedError.statusCode : 500;
    logger.error({ err: error, requestId: request.id }, "request failed");
    reply.code(statusCode).send(toErrorResponse(normalizedError, request.id));
  };
}

function normalizeError(error: FastifyError | Error): AppError | Error {
  if (error instanceof AppError) {
    return error;
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return new AppError({
      code: errorCodeForStatus(error.statusCode),
      message: error.message,
      statusCode: error.statusCode,
      expose: error.statusCode < 500
    });
  }

  return error;
}

function errorCodeForStatus(statusCode: number): ErrorCode {
  if (statusCode === 401) {
    return ErrorCode.UNAUTHORIZED;
  }
  if (statusCode === 403) {
    return ErrorCode.FORBIDDEN;
  }
  if (statusCode === 404) {
    return ErrorCode.NOT_FOUND;
  }
  if (statusCode === 409) {
    return ErrorCode.CONFLICT;
  }
  if (statusCode === 429) {
    return ErrorCode.RATE_LIMITED;
  }
  if (statusCode === 501) {
    return ErrorCode.NOT_IMPLEMENTED;
  }
  if (statusCode === 503) {
    return ErrorCode.SERVICE_UNAVAILABLE;
  }
  return statusCode < 500 ? ErrorCode.BAD_REQUEST : ErrorCode.INTERNAL_ERROR;
}
