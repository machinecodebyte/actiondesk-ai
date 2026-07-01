import { z } from "zod";
import { IdSchema, TimestampSchema } from "../common/index.js";

export const SyncStatusSchema = z.enum(["queued", "running", "success", "failed"]);

export const SyncRunSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  provider: z.string().min(1),
  syncType: z.string().min(1),
  status: SyncStatusSchema,
  startedAt: TimestampSchema,
  finishedAt: TimestampSchema.nullable(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable()
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type SyncRun = z.infer<typeof SyncRunSchema>;
