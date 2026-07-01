import { createInternalServiceClient } from "./internal-http-client.js";
import type {
  ApprovalRequest,
  ApproveActionInput,
  CreateApprovalInput,
  CreateCommandItemInput,
  ListApprovalsInput,
  ListApprovalsResponse,
  ListCommandItemsInput,
  ListCommandItemsResponse,
  RejectActionInput,
  SnoozeCommandInput,
  UpdateCommandStatusInput,
  CommandItem
} from "@actiondesk/contracts";
import { getJson, patchJson, postJson } from "./internal-http-client.js";

export function createCommandServiceClient(baseUrl: string, timeoutMs: number) {
  const base = createInternalServiceClient("command-service", baseUrl, timeoutMs);

  return {
    ...base,
    list: (input: ListCommandItemsInput, headers: Record<string, string>) =>
      getJson<ListCommandItemsResponse>(`${baseUrl}/commands?${queryString(input)}`, { timeoutMs, headers }),
    getById: (id: string, headers: Record<string, string>) =>
      getJson<{ item: CommandItem }>(`${baseUrl}/commands/${id}`, { timeoutMs, headers }),
    create: (input: CreateCommandItemInput, headers: Record<string, string>) =>
      postJson<{ item: CommandItem }>(`${baseUrl}/commands`, { timeoutMs, headers, body: input }),
    updateStatus: (input: UpdateCommandStatusInput, headers: Record<string, string>) =>
      patchJson<{ item: CommandItem }>(`${baseUrl}/commands/${input.id}/status`, {
        timeoutMs,
        headers,
        body: { status: input.status }
      }),
    snooze: (input: SnoozeCommandInput, headers: Record<string, string>) =>
      postJson<{ item: CommandItem }>(`${baseUrl}/commands/${input.id}/snooze`, {
        timeoutMs,
        headers,
        body: { snoozedUntil: input.snoozedUntil }
      }),
    dismiss: (id: string, headers: Record<string, string>) =>
      postJson<{ item: CommandItem }>(`${baseUrl}/commands/${id}/dismiss`, { timeoutMs, headers, body: {} }),
    markDone: (id: string, headers: Record<string, string>) =>
      postJson<{ item: CommandItem }>(`${baseUrl}/commands/${id}/mark-done`, { timeoutMs, headers, body: {} }),
    listApprovals: (input: ListApprovalsInput, headers: Record<string, string>) =>
      getJson<ListApprovalsResponse>(`${baseUrl}/approvals?${queryString(input)}`, { timeoutMs, headers }),
    createApproval: (input: CreateApprovalInput, headers: Record<string, string>) =>
      postJson<{ approval: ApprovalRequest }>(`${baseUrl}/approvals`, { timeoutMs, headers, body: input }),
    approve: (input: ApproveActionInput, headers: Record<string, string>) =>
      postJson<{ approval: ApprovalRequest }>(`${baseUrl}/approvals/${input.id}/approve`, {
        timeoutMs,
        headers,
        body: {}
      }),
    reject: (input: RejectActionInput, headers: Record<string, string>) =>
      postJson<{ approval: ApprovalRequest }>(`${baseUrl}/approvals/${input.id}/reject`, {
        timeoutMs,
        headers,
        body: {}
      })
  };
}

function queryString(input: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export type CommandServiceClient = ReturnType<typeof createCommandServiceClient>;
