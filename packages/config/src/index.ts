import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { z } from "zod";

export class EnvValidationError extends Error {
  constructor(message: string, readonly issues: string[]) {
    super(message);
    this.name = "EnvValidationError";
  }
}

export type EnvSource = Record<string, string | undefined>;

export type CreateEnvOptions = {
  source?: EnvSource;
};

export const LogLevelSchema = z.enum([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent"
]);

export const NodeEnvSchema = z.enum(["development", "test", "production"]);

export const BaseNodeEnvSchema = z
  .object({
    NODE_ENV: NodeEnvSchema.default("development"),
    LOG_LEVEL: LogLevelSchema.default("info"),
    SERVICE_VERSION: z.string().min(1).default("0.1.0"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(5000)
  })
  .strict();

export const DatabaseEnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    DATABASE_SSL: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true")
  })
  .strict();

export const RedisEnvSchema = z
  .object({
    REDIS_URL: z.string().url(),
    REDIS_PREFIX: z.string().min(1).default("actiondesk")
  })
  .strict();

export const InternalServiceUrlsSchema = z
  .object({
    AUTH_SERVICE_URL: z.string().url(),
    INTEGRATION_SERVICE_URL: z.string().url(),
    MAIL_SERVICE_URL: z.string().url(),
    CALENDAR_SERVICE_URL: z.string().url(),
    COMMAND_SERVICE_URL: z.string().url(),
    AI_SERVICE_URL: z.string().url(),
    AGENT_SERVICE_URL: z.string().url(),
    SEARCH_SERVICE_URL: z.string().url(),
    WEBHOOK_SERVICE_URL: z.string().url(),
    WORKER_SERVICE_URL: z.string().url(),
    REALTIME_SERVICE_URL: z.string().url()
  })
  .strict();

export const ObservabilityEnvSchema = z
  .object({
    OTEL_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    SERVICE_NAMESPACE: z.string().min(1).default("actiondesk-ai")
  })
  .strict();

export function createEnv<TShape extends z.ZodRawShape>(
  schema: z.ZodObject<TShape>,
  options: CreateEnvOptions = {}
): z.infer<z.ZodObject<TShape>> {
  const source = options.source ?? process.env;
  const selected = selectKnownKeys(schema, source);
  const result = schema.safeParse(selected);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".") || "env";
      return `${path}: ${issue.message}`;
    });

    throw new EnvValidationError(
      `Invalid environment configuration: ${issues.join("; ")}`,
      issues
    );
  }

  return result.data;
}

export function loadLocalEnvFiles(cwd = process.cwd()): void {
  const candidates = [resolve(cwd, ".env"), resolve(cwd, "../../.env")];

  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnvFile(file);
    }
  }
}

function selectKnownKeys<TShape extends z.ZodRawShape>(
  schema: z.ZodObject<TShape>,
  source: EnvSource
): Record<string, string | undefined> {
  return Object.keys(schema.shape).reduce<Record<string, string | undefined>>(
    (env, key) => {
      env[key] = source[key];
      return env;
    },
    {}
  );
}
