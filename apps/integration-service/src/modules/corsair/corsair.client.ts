import type { IntegrationProvider } from "@actiondesk/contracts";
import { AppError, ErrorCode } from "@actiondesk/errors";
import type { ServiceEnv } from "../../foundation/env.js";

export type CorsairStartConnectionRequest = {
  provider: IntegrationProvider;
  workspaceId: string;
  userId: string;
  state: string;
  redirectUrl: string;
};

export type CorsairStartConnectionResult = {
  connectUrl: string;
};

export type CorsairCompleteConnectionRequest = {
  provider: IntegrationProvider;
  workspaceId: string;
  userId: string;
  state: string;
  code?: string;
};

export type CorsairCompleteConnectionResult = {
  providerAccountEmail?: string;
  corsairAccountId?: string;
  corsairIntegrationId?: string;
  scopes?: string[];
};

export type CorsairDisconnectRequest = {
  provider: IntegrationProvider;
  workspaceId: string;
  corsairAccountId?: string | null;
  corsairIntegrationId?: string | null;
};

export type CorsairClient = {
  startConnection: (request: CorsairStartConnectionRequest) => Promise<CorsairStartConnectionResult>;
  completeConnection: (
    request: CorsairCompleteConnectionRequest
  ) => Promise<CorsairCompleteConnectionResult>;
  disconnect: (request: CorsairDisconnectRequest) => Promise<{ skipped: boolean; message?: string }>;
};

const corsairNotConfiguredMessage =
  "Corsair SDK is not configured yet. Add Corsair credentials to enable live connection.";

export function createCorsairClient(_env: ServiceEnv): CorsairClient {
  return {
    async startConnection() {
      throw corsairNotConfiguredError();
    },
    async completeConnection() {
      throw corsairNotConfiguredError();
    },
    async disconnect() {
      return {
        skipped: true,
        message: "Corsair revoke was skipped because the SDK is not configured."
      };
    }
  };
}

function corsairNotConfiguredError(): AppError {
  return new AppError({
    code: ErrorCode.NOT_IMPLEMENTED,
    message: corsairNotConfiguredMessage
  });
}
