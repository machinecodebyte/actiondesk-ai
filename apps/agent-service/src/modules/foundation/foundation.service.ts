import { getHealth, getMetadata, getReadiness } from "../../foundation/health.js";
import type { ServiceEnv } from "../../foundation/env.js";

export function createFoundationService(env: ServiceEnv) {
  return {
    getHealth: () => getHealth(env),
    getReadiness: () => getReadiness(env),
    getMetadata: () => getMetadata(env)
  };
}
