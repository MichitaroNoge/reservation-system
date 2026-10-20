import assert from "node:assert/strict";
import test from "node:test";
import { nextCounter, RateLimitError } from "../lib/abuse-limits";
import { apiErrorResponse, readJsonObject, validateUpdateReservationInput, validateStoreAssignments } from "../lib/api-validation";

test("rate counters deny within window and reset at expiry", () => {
  const limit = { key: "test", max: 2, seconds: 60 };
  assert.deepEqual(nextCounter(0, 0, 1000, limit), { count: 1, expiresAt: 61000 });
  assert.deepEqual(nextCounter(1, 61000, 2000, limit), { count: 2, expiresAt: 61000 });
  assert.throws(() => nextCounter(2, 61000, 2000, limit), RateLimitError);
  assert.equal(nextCounter(2, 61000, 61000, limit).count, 1);
  const response = apiErrorResponse(new RateLimitError(59));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "59");
});

test("JSON limit applies to streamed bytes without Content-Length", async () => {
  const request = new Request("https://example.com", { method: "POST", body: JSON.stringify({ value: "あ".repeat(23000) }) });
  await assert.rejects(readJsonObject(request), (error: unknown) => apiErrorResponse(error).status === 413);
  assert.deepEqual(await readJsonObject(new Request("https://example.com", { method: "POST", body: '{"ok":true}' })), { ok: true });
});

test("arrays are bounded before per-item processing", () => {
  assert.throws(() => validateUpdateReservationInput({ menuItems: Array(51).fill("menu") }), /50 items/);
  assert.equal(validateUpdateReservationInput({ menuItems: Array(50).fill("menu") }).menuItems?.length, 50);
  assert.throws(() => validateStoreAssignments({ assignments: Array(51).fill({ store: "store", people: 1 }) }, 51), /50 items/);
});
