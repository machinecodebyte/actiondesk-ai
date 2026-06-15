import {
  BaseNodeEnvSchema,
  createEnv,
  DatabaseEnvSchema,
  loadLocalEnvFiles,
  ObservabilityEnvSchema
} from "@actiondesk/config";
import { z } from "zod";

const ServiceEnvSchema = BaseNodeEnvSchema.extend({
  SERVICE_NAME: z.literal("integration-service").default("integration-service"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4152),
  CORSAIR_API_KEY: z.string().optional(),
  CORSAIR_APP_ID: z.string().optional(),
  CORSAIR_WEBHOOK_SECRET: z.string().optional(),
  CORSAIR_REDIRECT_BASE_URL: z.string().url().default("http://localhost:3050/auth/callback"),
  ...DatabaseEnvSchema.shape,
  ...ObservabilityEnvSchema.shape
}).strict();

export type ServiceEnv = z.infer<typeof ServiceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  loadLocalEnvFiles();

  return createEnv(ServiceEnvSchema, {
    source: {
      ...process.env,
      PORT: process.env.PORT ?? process.env.INTEGRATION_SERVICE_PORT
    }
  });
}
