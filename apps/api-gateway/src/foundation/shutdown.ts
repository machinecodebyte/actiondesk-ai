import type { FastifyInstance } from "fastify";
import type { Logger } from "@actiondesk/logger";

export type ShutdownOptions = {
  app: FastifyInstance;
  logger: Logger;
};

export function registerGracefulShutdown(options: ShutdownOptions): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal, options);
    });
  }
}

async function shutdown(signal: NodeJS.Signals, options: ShutdownOptions): Promise<void> {
  options.logger.info({ signal }, "api gateway shutdown started");

  try {
    await options.app.close();
    options.logger.info("api gateway shutdown complete");
    process.exit(0);
  } catch (error) {
    options.logger.error({ err: error }, "api gateway shutdown failed");
    process.exit(1);
  }
}
