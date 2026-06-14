import type { ServiceEnv } from "../../foundation/env.js";
import { createFoundationService } from "./foundation.service.js";

export function createFoundationController(env: ServiceEnv) {
  const service = createFoundationService(env);

  return {
    health: async () => service.getHealth(),
    ready: async () => service.getReadiness(),
    metadata: async () => service.getMetadata()
  };
}
