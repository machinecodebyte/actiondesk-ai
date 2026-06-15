import { BaseNodeEnvSchema, createEnv, loadLocalEnvFiles, ObservabilityEnvSchema } from "@actiondesk/config";
import { z } from "zod";

const ServiceEnvSchema = BaseNodeEnvSchema.extend({
  SERVICE_NAME: z.literal("webhook-service").default("webhook-service"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4159),
  ...ObservabilityEnvSchema.shape
}).strict();

export type ServiceEnv = z.infer<typeof ServiceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  loadLocalEnvFiles();

  return createEnv(ServiceEnvSchema, {
    source: {
      ...process.env,
      PORT: process.env.PORT ?? process.env.WEBHOOK_SERVICE_PORT
    }
  });
}
