import { z } from "zod";
import { IdSchema, PaginationInputSchema, PaginationMetaSchema, TimestampSchema } from "../common/index.js";

export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "executed", "failed"]);

export const ApprovalRequestSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  userId: IdSchema,
  commandItemId: IdSchema.nullable(),
  actionType: z.string().min(1),
  payload: z.record(z.unknown()),
  status: ApprovalStatusSchema,
  approvedAt: TimestampSchema.nullable(),
  rejectedAt: TimestampSchema.nullable(),
  executedAt: TimestampSchema.nullable(),
  errorMessage: z.string().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const CreateApprovalInputSchema = z.object({
  commandItemId: IdSchema.optional(),
  actionType: z.string().trim().min(1).max(120),
  payload: z.record(z.unknown())
});

export const ApproveActionInputSchema = z.object({
  id: IdSchema
});

export const RejectActionInputSchema = z.object({
  id: IdSchema
});

export const ListApprovalsInputSchema = PaginationInputSchema.extend({
  status: ApprovalStatusSchema.optional(),
  actionType: z.string().trim().min(1).max(120).optional()
});

export const ListApprovalsResponseSchema = z.object({
  approvals: z.array(ApprovalRequestSchema),
  pagination: PaginationMetaSchema
});

export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type CreateApprovalInput = z.infer<typeof CreateApprovalInputSchema>;
export type ApproveActionInput = z.infer<typeof ApproveActionInputSchema>;
export type RejectActionInput = z.infer<typeof RejectActionInputSchema>;
export type ListApprovalsInput = z.infer<typeof ListApprovalsInputSchema>;
export type ListApprovalsResponse = z.infer<typeof ListApprovalsResponseSchema>;
