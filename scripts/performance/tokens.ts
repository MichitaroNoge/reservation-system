/** Synthetic, unsigned JWT accepted ONLY by scripts/performance/server.ts, never application auth. */
export function fixtureToken(admin: boolean) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    aud: "demo-reservation-google", iss: "https://securetoken.google.com/demo-reservation-google",
    sub: "calendar-test-user", user_id: "calendar-test-user", email: admin ? "admin@example.test" : "member@example.test",
    email_verified: true, admin, auth_time: 1794800000, iat: 1794800000, exp: 4102444800,
    firebase: { sign_in_provider: "password", identities: {} },
  })}.fixture`;
}
