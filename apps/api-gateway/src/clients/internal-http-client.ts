export type GetJsonOptions = {
  timeoutMs: number;
  headers?: Record<string, string>;
};

export async function getJson<T>(url: string, options: GetJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const requestInit: RequestInit = {
    signal: controller.signal
  };

  if (options.headers) {
    requestInit.headers = options.headers;
  }

  try {
    const response = await fetch(url, requestInit);

    if (!response.ok) {
      throw new Error(`GET ${url} failed with ${response.status}`);
    }

    return (await response.json()) as T;
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
