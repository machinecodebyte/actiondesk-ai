import {
  BaseNodeEnvSchema,
  createEnv,
  InternalServiceUrlsSchema,
  loadLocalEnvFiles,
  ObservabilityEnvSchema
} from "@actiondesk/config";
import { z } from "zod";

const GatewayEnvSchema = BaseNodeEnvSchema.extend({
  SERVICE_NAME: z.literal("api-gateway").default("api-gateway"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  API_GATEWAY_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  ...InternalServiceUrlsSchema.shape,
  ...ObservabilityEnvSchema.shape
}).strict();

export type GatewayEnv = z.infer<typeof GatewayEnvSchema>;

export function loadGatewayEnv(): GatewayEnv {
  loadLocalEnvFiles();

  return createEnv(GatewayEnvSchema, {
    source: {
      ...process.env,
      PORT: process.env.PORT ?? process.env.API_GATEWAY_PORT
    }
  });
}
