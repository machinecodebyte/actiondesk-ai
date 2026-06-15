import { z } from "zod";
import { IdSchema, TimestampSchema } from "../common/index.js";
import { WorkspaceSchema } from "../workspace/index.js";

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  name: z.string().min(1).max(120).optional(),
  workspaceName: z.string().min(2).max(120).optional()
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256)
});

export const LogoutInputSchema = z.object({
  refreshToken: z.string().min(1).optional()
});

export const RefreshSessionInputSchema = z.object({
  refreshToken: z.string().min(1).optional()
});

export const CurrentUserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  timezone: z.string().min(1),
  status: z.enum(["active", "disabled"]),
  activeWorkspace: WorkspaceSchema.nullable(),
  createdAt: TimestampSchema
});

export const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: TimestampSchema
});

export const AuthResponseSchema = z.object({
  user: CurrentUserSchema,
  workspace: WorkspaceSchema.nullable(),
  session: AuthSessionSchema
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type LogoutInput = z.infer<typeof LogoutInputSchema>;
export type RefreshSessionInput = z.infer<typeof RefreshSessionInputSchema>;
export type CurrentUser = z.infer<typeof CurrentUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
