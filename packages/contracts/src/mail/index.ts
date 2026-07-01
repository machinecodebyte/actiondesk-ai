import { z } from "zod";
import { IdSchema, PaginationInputSchema, PaginationMetaSchema, TimestampSchema } from "../common/index.js";

export const MailThreadSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  provider: z.literal("gmail"),
  providerThreadId: z.string().min(1),
  subject: z.string().nullable(),
  snippet: z.string().nullable(),
  fromEmail: z.string().email().nullable(),
  fromName: z.string().nullable(),
  lastMessageAt: TimestampSchema.nullable(),
  unread: z.boolean(),
  rawMetadata: z.record(z.unknown()).nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const MailMessageSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  threadId: IdSchema.nullable(),
  provider: z.literal("gmail"),
  providerMessageId: z.string().min(1),
  subject: z.string().nullable(),
  snippet: z.string().nullable(),
  bodyText: z.string().nullable(),
  fromEmail: z.string().email().nullable(),
  fromName: z.string().nullable(),
  toEmails: z.array(z.string()).nullable(),
  ccEmails: z.array(z.string()).nullable(),
  receivedAt: TimestampSchema.nullable(),
  unread: z.boolean(),
  hasAttachments: z.boolean(),
  rawMetadata: z.record(z.unknown()).nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ListMailThreadsInputSchema = PaginationInputSchema.extend({
  unread: z.boolean().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  fromEmail: z.string().trim().email().optional()
});

export const ListMailThreadsResponseSchema = z.object({
  threads: z.array(MailThreadSchema),
  pagination: PaginationMetaSchema
});

export const GetMailThreadInputSchema = z.object({
  id: IdSchema
});

export const GetMailThreadResponseSchema = z.object({
  thread: MailThreadSchema,
  messages: z.array(MailMessageSchema)
});

export const SyncMailInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25)
});

export const CreateDraftReplyInputSchema = z.object({
  threadId: IdSchema,
  body: z.string().trim().min(1).max(50000)
});

export const CreateDraftReplyResponseSchema = z.object({
  draftId: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  message: z.string().optional()
});

export type MailThread = z.infer<typeof MailThreadSchema>;
export type MailMessage = z.infer<typeof MailMessageSchema>;
export type ListMailThreadsInput = z.infer<typeof ListMailThreadsInputSchema>;
export type ListMailThreadsResponse = z.infer<typeof ListMailThreadsResponseSchema>;
export type GetMailThreadInput = z.infer<typeof GetMailThreadInputSchema>;
export type GetMailThreadResponse = z.infer<typeof GetMailThreadResponseSchema>;
export type SyncMailInput = z.infer<typeof SyncMailInputSchema>;
export type CreateDraftReplyInput = z.infer<typeof CreateDraftReplyInputSchema>;
export type CreateDraftReplyResponse = z.infer<typeof CreateDraftReplyResponseSchema>;
