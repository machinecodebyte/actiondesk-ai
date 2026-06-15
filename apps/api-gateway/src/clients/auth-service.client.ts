import type {
  AuthResponse,
  CreateWorkspaceInput,
  CurrentUser,
  LoginInput,
  LogoutInput,
  RefreshSessionInput,
  RegisterInput,
  SwitchWorkspaceInput,
  Workspace
} from "@actiondesk/contracts";
import { createInternalServiceClient, getJson, postJson } from "./internal-http-client.js";

export function createAuthServiceClient(baseUrl: string, timeoutMs: number) {
  const base = createInternalServiceClient("auth-service", baseUrl, timeoutMs);

  return {
    ...base,
    register: (input: RegisterInput) =>
      postJson<AuthResponse>(`${baseUrl}/auth/register`, { timeoutMs, body: input }),
    login: (input: LoginInput) =>
      postJson<AuthResponse>(`${baseUrl}/auth/login`, { timeoutMs, body: input }),
    refresh: (input: RefreshSessionInput) =>
      postJson<AuthResponse>(`${baseUrl}/auth/refresh`, { timeoutMs, body: input }),
    logout: (input: LogoutInput, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/auth/logout`, { timeoutMs, headers, body: input }),
    me: (headers: Record<string, string>) =>
      getJson<CurrentUser>(`${baseUrl}/auth/me`, { timeoutMs, headers }),
    listWorkspaces: (headers: Record<string, string>) =>
      getJson<{ workspaces: Workspace[] }>(`${baseUrl}/workspaces`, { timeoutMs, headers }),
    createWorkspace: (input: CreateWorkspaceInput, headers: Record<string, string>) =>
      postJson<{ workspace: Workspace }>(`${baseUrl}/workspaces`, { timeoutMs, headers, body: input }),
    switchWorkspace: (input: SwitchWorkspaceInput, headers: Record<string, string>) =>
      postJson<{ workspace: Workspace; accessToken: string }>(`${baseUrl}/workspaces/switch`, {
        timeoutMs,
        headers,
        body: input
      })
  };
}

export type AuthServiceClient = ReturnType<typeof createAuthServiceClient>;
