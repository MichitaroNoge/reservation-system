import type { ApiRequestInit } from "./types";

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
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
