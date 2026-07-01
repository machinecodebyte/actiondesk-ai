import { createInternalServiceClient } from "./internal-http-client.js";
import type {
  CreateDraftReplyInput,
  CreateDraftReplyResponse,
  GetMailThreadResponse,
  ListMailThreadsInput,
  ListMailThreadsResponse,
  SyncMailInput
} from "@actiondesk/contracts";
import { getJson, postJson } from "./internal-http-client.js";

export function createMailServiceClient(baseUrl: string, timeoutMs: number) {
  const base = createInternalServiceClient("mail-service", baseUrl, timeoutMs);

  return {
    ...base,
    listThreads: (input: ListMailThreadsInput, headers: Record<string, string>) =>
      getJson<ListMailThreadsResponse>(`${baseUrl}/mail/threads?${queryString(input)}`, {
        timeoutMs,
        headers
      }),
    getThread: (id: string, headers: Record<string, string>) =>
      getJson<GetMailThreadResponse>(`${baseUrl}/mail/threads/${id}`, { timeoutMs, headers }),
    sync: (input: SyncMailInput, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/mail/sync`, { timeoutMs, headers, body: input }),
    createDraftReply: (input: CreateDraftReplyInput, headers: Record<string, string>) =>
      postJson<CreateDraftReplyResponse>(`${baseUrl}/mail/threads/${input.threadId}/draft-reply`, {
        timeoutMs,
        headers,
        body: { body: input.body }
      }),
    archive: (id: string, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/mail/threads/${id}/archive`, { timeoutMs, headers, body: {} }),
    markRead: (id: string, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/mail/threads/${id}/mark-read`, { timeoutMs, headers, body: {} }),
    markUnread: (id: string, headers: Record<string, string>) =>
      postJson<{ ok: true }>(`${baseUrl}/mail/threads/${id}/mark-unread`, { timeoutMs, headers, body: {} })
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

export type MailServiceClient = ReturnType<typeof createMailServiceClient>;
