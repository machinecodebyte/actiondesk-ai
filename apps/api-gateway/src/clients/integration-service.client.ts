import type {
  CompleteConnectionInput,
  ConnectedAccount,
  IntegrationProvider,
  IntegrationStatusResponse,
  StartConnectionInput,
  StartConnectionResponse
} from "@actiondesk/contracts";
import { createInternalServiceClient, getJson, postJson } from "./internal-http-client.js";

export function createIntegrationServiceClient(baseUrl: string, timeoutMs: number) {
  const base = createInternalServiceClient("integration-service", baseUrl, timeoutMs);

  return {
    ...base,
    status: (headers: Record<string, string>) =>
      getJson<IntegrationStatusResponse>(`${baseUrl}/integrations/status`, { timeoutMs, headers }),
    startConnection: (input: StartConnectionInput, headers: Record<string, string>) =>
      postJson<StartConnectionResponse>(
        `${baseUrl}/integrations/${input.provider}/connect/start`,
        { timeoutMs, headers, body: input }
      ),
    completeConnection: (input: CompleteConnectionInput, headers: Record<string, string>) =>
      postJson<{ account: ConnectedAccount }>(
        `${baseUrl}/integrations/${input.provider}/connect/complete`,
        { timeoutMs, headers, body: input }
      ),
    disconnect: (provider: IntegrationProvider, headers: Record<string, string>) =>
      postJson<{ account: ConnectedAccount; message?: string }>(
        `${baseUrl}/integrations/${provider}/disconnect`,
        { timeoutMs, headers, body: {} }
      )
  };
}

export type IntegrationServiceClient = ReturnType<typeof createIntegrationServiceClient>;
