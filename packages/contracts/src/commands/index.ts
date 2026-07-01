import { z } from "zod";
import { IdSchema, PaginationInputSchema, PaginationMetaSchema, TimestampSchema } from "../common/index.js";

export const CommandStatusSchema = z.enum(["open", "snoozed", "waiting", "done", "dismissed", "failed"]);
export const CommandPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const CommandIntentSchema = z.enum(["manual", "draft_reply", "schedule_meeting", "follow_up"]);
export const CommandSourceTypeSchema = z.enum(["email", "calendar", "manual"]);

export const CommandItemSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  userId: IdSchema,
  sourceType: CommandSourceTypeSchema,
  sourceId: IdSchema.nullable(),
  sourceProviderId: z.string().nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  intent: CommandIntentSchema,
  priority: CommandPrioritySchema,
  status: CommandStatusSchema,
  suggestedAction: z.string().nullable(),
  dueAt: TimestampSchema.nullable(),
  snoozedUntil: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ListCommandItemsInputSchema = PaginationInputSchema.extend({
  status: CommandStatusSchema.optional(),
  priority: CommandPrioritySchema.optional(),
  intent: CommandIntentSchema.optional()
});

export const ListCommandItemsResponseSchema = z.object({
  items: z.array(CommandItemSchema),
  pagination: PaginationMetaSchema
});

export const CreateCommandItemInputSchema = z.object({
  sourceType: CommandSourceTypeSchema.default("manual"),
  sourceId: IdSchema.optional(),
  sourceProviderId: z.string().trim().min(1).max(300).optional(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(2000).optional(),
  intent: CommandIntentSchema.default("manual"),
  priority: CommandPrioritySchema.default("normal"),
  dueAt: TimestampSchema.optional()
});

export const UpdateCommandStatusInputSchema = z.object({
  id: IdSchema,
  status: CommandStatusSchema
});

export const SnoozeCommandInputSchema = z.object({
  id: IdSchema,
  snoozedUntil: TimestampSchema
});

export const GetCommandItemInputSchema = z.object({
  id: IdSchema
});

export type CommandStatus = z.infer<typeof CommandStatusSchema>;
export type CommandPriority = z.infer<typeof CommandPrioritySchema>;
export type CommandIntent = z.infer<typeof CommandIntentSchema>;
export type CommandSourceType = z.infer<typeof CommandSourceTypeSchema>;
export type CommandItem = z.infer<typeof CommandItemSchema>;
export type ListCommandItemsInput = z.infer<typeof ListCommandItemsInputSchema>;
export type ListCommandItemsResponse = z.infer<typeof ListCommandItemsResponseSchema>;
export type CreateCommandItemInput = z.infer<typeof CreateCommandItemInputSchema>;
export type UpdateCommandStatusInput = z.infer<typeof UpdateCommandStatusInputSchema>;
export type SnoozeCommandInput = z.infer<typeof SnoozeCommandInputSchema>;
export type GetCommandItemInput = z.infer<typeof GetCommandItemInputSchema>;
