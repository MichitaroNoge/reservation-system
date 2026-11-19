import type { BrowserContext } from "playwright-core";
import { fixtureToken } from "./tokens";

export const base = "http://127.0.0.1:3310";
export async function isolate(context: BrowserContext) {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.hostname === "identitytoolkit.googleapis.com" || url.hostname === "securetoken.googleapis.com") {
      const body = route.request().postDataJSON() as { email?: string } | null;
      const admin = body?.email === "admin@example.test";
      const email = admin ? "admin@example.test" : "member@example.test";
      const user = { localId: "calendar-test-user", email, emailVerified: true, displayName: "計測利用者", providerUserInfo: [{ providerId: "password", email, rawId: email }] };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(url.pathname.includes("lookup") ? { users: [user] } : {
        ...user, idToken: fixtureToken(admin), refreshToken: "fixture-refresh", expiresIn: "3600", registered: true,
      }) });
    }
    return route.abort("blockedbyclient");
  });
}
