import { z } from "zod";

export const IdSchema = z.string().uuid();

export const PaginationInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0).optional(),
  totalPages: z.number().int().min(0).optional(),
  nextCursor: z.string().nullable().optional()
});

export const ServiceHealthSchema = z.object({
  service: z.string().min(1),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  uptime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  checks: z
    .array(
      z.object({
        name: z.string().min(1),
        status: z.enum(["healthy", "degraded", "unhealthy"]),
        message: z.string().optional(),
        durationMs: z.number().nonnegative().optional()
      })
    )
    .default([])
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().optional(),
    details: z.unknown().optional()
  })
});

export type Id = z.infer<typeof IdSchema>;
export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export * from "./agent/index.js";
export * from "./ai/index.js";
export * from "./approvals/index.js";
export * from "./auth/index.js";
export * from "./calendar/index.js";
export * from "./commands/index.js";
export * from "./events/index.js";
export * from "./inbox/index.js";
export * from "./integrations/index.js";
export * from "./search/index.js";
export * from "./workspace/index.js";
