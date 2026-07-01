import Fastify from "fastify";
import { createRequestId } from "@actiondesk/observability";
import type { ServiceEnv } from "./env.js";

export function createHttpServer(_env: ServiceEnv) {
  return Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: false
      }
    },
    genReqId(request) {
      const header = request.headers["x-request-id"];
      return createRequestId(Array.isArray(header) ? header[0] : header);
    }
  });
}
