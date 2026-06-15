import { z } from "zod";
import { IdSchema, TimestampSchema } from "../common/index.js";

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member"]);

export const WorkspaceSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  ownerId: IdSchema,
  corsairTenantId: z.string().nullable(),
  createdAt: TimestampSchema
});

export const WorkspaceMemberSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  userId: IdSchema,
  role: WorkspaceRoleSchema,
  createdAt: TimestampSchema
});

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(2).max(120)
});

export const SwitchWorkspaceInputSchema = z.object({
  workspaceId: IdSchema
});

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;
export type SwitchWorkspaceInput = z.infer<typeof SwitchWorkspaceInputSchema>;
