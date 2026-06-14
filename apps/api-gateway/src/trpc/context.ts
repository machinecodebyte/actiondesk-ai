import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import type { Logger } from "@actiondesk/logger";
import type { GatewayEnv } from "../foundation/env.js";
import { createAuthContext, type AuthContext } from "../foundation/auth-context.js";
import type { ServiceRegistry } from "../foundation/service-registry.js";

export type GatewayContext = {
  requestId: string;
  auth: AuthContext;
  env: GatewayEnv;
  logger: Logger;
  services: ServiceRegistry;
};

export type ContextFactoryOptions = {
  env: GatewayEnv;
  logger: Logger;
  services: ServiceRegistry;
};

export function createTrpcContextFactory(options: ContextFactoryOptions) {
  return async ({ req }: CreateFastifyContextOptions): Promise<GatewayContext> => ({
    requestId: req.id,
    auth: createAuthContext(req),
    env: options.env,
    logger: options.logger.child({ requestId: req.id }),
    services: options.services
  });
}
