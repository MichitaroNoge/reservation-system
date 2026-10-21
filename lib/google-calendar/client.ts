import "server-only";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { calendarConfig, calendarScope, CalendarError } from "./security";
import type { CalendarEvent } from "./policy";

export function oauthClient() {
  const c = calendarConfig();
  return new OAuth2Client({ clientId: c.clientId, clientSecret: c.clientSecret, redirectUri: c.redirectUri, transporterOptions: { timeout: 8000, retry: false } });
}
export function authorizationUrl(state: string, verifier: string) {
  const client = oauthClient();
  // SHA-256 PKCE is generated separately to persist only the encrypted verifier.
  return client.generateAuthUrl({ access_type: "offline", prompt: "consent select_account", scope: ["openid", "email", calendarScope], state, code_challenge: verifier, code_challenge_method: CodeChallengeMethod.S256, include_granted_scopes: false });
}
export function providerFailure(error: unknown): CalendarError {
  const code = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
  if (code === 401 || code === 403) return new CalendarError("reconnect_required");
  if (code === 429) return new CalendarError("rate_limited");
  if (code === 404 || code === 410) return new CalendarError("calendar_missing");
  return error instanceof CalendarError ? error : new CalendarError("provider_error");
}
export type CalendarClient = {
  createCalendar: () => Promise<string>;
  verifyCalendar: (id: string) => Promise<void>;
  put: (calendarId: string, eventId: string, event: CalendarEvent) => Promise<void>;
  remove: (calendarId: string, eventId: string) => Promise<void>;
};
export async function googleCalendarClient(refreshToken: string): Promise<CalendarClient> {
  const client = oauthClient(); client.setCredentials({ refresh_token: refreshToken });
  let accessToken: string;
  try { const result = await client.getAccessToken(); if (!result.token) throw new Error(); accessToken = result.token; }
  catch (error) {
    const e = error as { response?: { status?: number; data?: { error?: string } } };
    throw new CalendarError(e.response?.data?.error === "invalid_grant" || e.response?.status === 401 ? "reconnect_required" : "provider_error");
  }
  async function request(path: string, method: string, data?: unknown) {
    try {
      return await fetch(`https://www.googleapis.com/calendar/v3/${path}`, { method, headers: { Authorization: `Bearer ${accessToken}`, ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store" });
    } catch { throw new CalendarError("provider_error"); }
  }
  const path = (id: string) => `calendars/${encodeURIComponent(id)}/events`;
  const assert = async (response: Response) => {
    if (response.ok) return;
    if (response.status === 403) {
      const body = await response.json().catch(() => null);
      if (body?.error?.errors?.some((entry: { reason?: string }) => ["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"].includes(entry.reason ?? ""))) throw new CalendarError("rate_limited");
    }
    throw providerFailure({ status: response.status });
  };
  return {
    async verifyCalendar(id) { await assert(await request(`${path(id)}?maxResults=1&fields=kind`, "GET")); },
    async createCalendar() {
      const response = await request("calendars", "POST", { summary: "団体予約", timeZone: "Asia/Tokyo", description: "予約管理サイトから自動反映する承認済み予約。共有設定は管理者がGoogleカレンダーで行ってください。" });
      await assert(response); const body = await response.json(); if (typeof body.id !== "string" || !body.id) throw new CalendarError("provider_error"); return body.id;
    },
    async put(calendarId, eventId, event) {
      const url = `${path(calendarId)}/${eventId.replaceAll("-", "")}?sendUpdates=none`;
      let response = await request(url, "PUT", event);
      if (response.status === 404) {
        response = await request(`${path(calendarId)}?sendUpdates=none`, "POST", { ...event, id: eventId.replaceAll("-", "") });
        // An insert may have succeeded before its response was lost; update the same ID.
        if (response.status === 409) {
          const existing = await request(`${path(calendarId)}/${eventId.replaceAll("-", "")}?fields=status`, "GET");
          if ([404, 410].includes(existing.status) || (existing.ok && (await existing.json()).status === "cancelled")) throw new CalendarError("event_deleted", 409);
          await assert(existing); response = await request(url, "PUT", event);
        }
      }
      if (response.status === 410) throw new CalendarError("event_deleted", 409);
      await assert(response);
    },
    async remove(calendarId, eventId) {
      const response = await request(`${path(calendarId)}/${eventId.replaceAll("-", "")}?sendUpdates=none`, "DELETE");
      if (![404, 410].includes(response.status)) await assert(response);
    },
  };
}
