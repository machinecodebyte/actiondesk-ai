import { ErrorCode, type ErrorResponse } from "@actiondesk/errors";

export type JsonRequestOptions = {
  timeoutMs: number;
  headers?: Record<string, string>;
  body?: unknown;
};

export class ServiceClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(options: { statusCode: number; code: string; message: string; details?: unknown }) {
    super(options.message);
    this.name = "ServiceClientError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export async function getJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
  return requestJson<T>("GET", url, options);
}

export async function postJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
  return requestJson<T>("POST", url, options);
}

export async function patchJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
  return requestJson<T>("PATCH", url, options);
}

export async function deleteJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
  return requestJson<T>("DELETE", url, options);
}

async function requestJson<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  options: JsonRequestOptions
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const requestInit: RequestInit = {
    method,
    signal: controller.signal
  };

  requestInit.headers = {
    ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    ...options.headers
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, requestInit);

    if (!response.ok) {
      throw await toServiceError(response, method, url);
    }

    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  } catch (error) {
    if (error instanceof ServiceClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ServiceClientError({
        statusCode: 503,
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: `${method} ${url} timed out`
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type InternalServiceClient = {
  name: string;
  baseUrl: string;
  getHealth: () => Promise<unknown>;
  getMetadata: () => Promise<unknown>;
};

export function createInternalServiceClient(
  name: string,
  baseUrl: string,
  timeoutMs: number
): InternalServiceClient {
  return {
    name,
    baseUrl,
    getHealth: () => getJson(`${baseUrl}/health`, { timeoutMs }),
    getMetadata: () => getJson(`${baseUrl}/metadata`, { timeoutMs })
  };
}

async function toServiceError(response: Response, method: string, url: string): Promise<ServiceClientError> {
  const payload = await readErrorPayload(response);

  if (payload?.error) {
    return new ServiceClientError({
      statusCode: response.status,
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details
    });
  }

  return new ServiceClientError({
    statusCode: response.status,
    code: ErrorCode.SERVICE_UNAVAILABLE,
    message: `${method} ${url} failed with ${response.status}`
  });
}

async function readErrorPayload(response: Response): Promise<ErrorResponse | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return null;
  }
}
