import type { ApiRequestInit } from "./types";

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly fields?: Record<string, string[]>) {
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
    let fields: Record<string, string[]> | undefined;
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") message = body.error;
      if (body?.fields && typeof body.fields === "object" && !Array.isArray(body.fields)) {
        fields = Object.fromEntries(Object.entries(body.fields).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every(value => typeof value === "string")));
      }
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new ApiRequestError(message, response.status, fields);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
