import {
  BaseNodeEnvSchema,
  createEnv,
  DatabaseEnvSchema,
  loadLocalEnvFiles,
  ObservabilityEnvSchema
} from "@actiondesk/config";
import { z } from "zod";

const ServiceEnvSchema = BaseNodeEnvSchema.extend({
  SERVICE_NAME: z.literal("auth-service").default("auth-service"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4151),
  AUTH_JWT_ACCESS_SECRET: z.string().min(32),
  AUTH_JWT_REFRESH_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  PASSWORD_HASH_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  PASSWORD_HASH_TIME_COST: z.coerce.number().int().positive().default(2),
  PASSWORD_HASH_PARALLELISM: z.coerce.number().int().positive().default(1),
  ...DatabaseEnvSchema.shape,
  ...ObservabilityEnvSchema.shape
}).strict();

export type ServiceEnv = z.infer<typeof ServiceEnvSchema>;

export function loadServiceEnv(): ServiceEnv {
  loadLocalEnvFiles();

  return createEnv(ServiceEnvSchema, {
    source: {
      ...process.env,
      PORT: process.env.PORT ?? process.env.AUTH_SERVICE_PORT
    }
  });
}
