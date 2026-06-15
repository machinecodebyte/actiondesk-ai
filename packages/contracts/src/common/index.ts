import { z } from "zod";

export const IdSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

export const ApiSuccessSchema = z.object({
  ok: z.literal(true)
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().optional(),
    details: z.unknown().optional()
  })
});

export const ServiceHealthSchema = z.object({
  service: z.string().min(1),
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  uptime: z.number().nonnegative(),
  timestamp: TimestampSchema,
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

export type Id = z.infer<typeof IdSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;
export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
