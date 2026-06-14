import { createLogger, type Logger } from "@actiondesk/logger";
import type { ServiceEnv } from "./env.js";

export function createServiceLogger(env: ServiceEnv): Logger {
  return createLogger({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    version: env.SERVICE_VERSION,
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV === "development"
  });
}
