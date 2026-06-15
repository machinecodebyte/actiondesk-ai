import { z } from "zod";
import { IdSchema, TimestampSchema } from "../common/index.js";

export const IntegrationProviderSchema = z.enum(["gmail", "google_calendar"]);
export const ConnectionStatusSchema = z.enum(["disconnected", "connecting", "connected", "error"]);

export const ConnectedAccountSchema = z.object({
  id: IdSchema.nullable(),
  workspaceId: IdSchema,
  userId: IdSchema.nullable(),
  provider: IntegrationProviderSchema,
  providerAccountEmail: z.string().email().nullable(),
  corsairAccountId: z.string().nullable(),
  corsairIntegrationId: z.string().nullable(),
  status: ConnectionStatusSchema,
  scopes: z.array(z.string()).nullable(),
  lastSyncAt: TimestampSchema.nullable(),
  connectedAt: TimestampSchema.nullable(),
  errorMessage: z.string().nullable(),
  createdAt: TimestampSchema.nullable(),
  updatedAt: TimestampSchema.nullable()
});

export const StartConnectionInputSchema = z.object({
  provider: IntegrationProviderSchema,
  redirectUrl: z.string().url().optional()
});

export const StartConnectionResponseSchema = z.object({
  provider: IntegrationProviderSchema,
  status: ConnectionStatusSchema,
  connectUrl: z.string().url().nullable(),
  message: z.string().optional()
});

export const CompleteConnectionInputSchema = z.object({
  provider: IntegrationProviderSchema,
  state: z.string().min(16),
  code: z.string().min(1).optional()
});

export const IntegrationStatusResponseSchema = z.object({
  accounts: z.array(ConnectedAccountSchema)
});

export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export type StartConnectionInput = z.infer<typeof StartConnectionInputSchema>;
export type StartConnectionResponse = z.infer<typeof StartConnectionResponseSchema>;
export type CompleteConnectionInput = z.infer<typeof CompleteConnectionInputSchema>;
export type IntegrationStatusResponse = z.infer<typeof IntegrationStatusResponseSchema>;
