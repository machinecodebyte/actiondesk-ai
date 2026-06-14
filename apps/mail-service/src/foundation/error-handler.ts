import { AppError, toErrorResponse } from "@actiondesk/errors";
import type { Logger } from "@actiondesk/logger";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function createErrorHandler(logger: Logger) {
  return (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    logger.error({ err: error, requestId: request.id }, "request failed");
    reply.code(statusCode).send(toErrorResponse(error, request.id));
  };
}
