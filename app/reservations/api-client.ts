import type { ApiRequestInit } from "./types";

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function requestJson<T>(url: string, init?: ApiRequestInit): Promise<T> {
  const { authToken, headers, ...requestInit } = init ?? {};
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });
  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new ApiRequestError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
