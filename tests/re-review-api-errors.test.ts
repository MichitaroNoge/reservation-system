import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorResponse } from "../lib/api-validation";

test("infrastructure errors remain private when they also carry an HTTP status", async () => {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...values: unknown[]) => { logged.push(values); };
  try {
    const database = Object.assign(new Error("query contains private@example.test secret-value"), {
      statusCode: 400, query: "insert into reservation values ($1)", params: ["private@example.test"],
      cause: Object.assign(new Error("private database failure"), { code: "23505" }),
    });
    const provider = Object.assign(new Error("private@example.test secret-value"), { name: "DataConnectOperationError", statusCode: 502 });
    // Firebase Admin exposes Data Connect identity via code, not Error.name.
    const sdk = Object.assign(new Error("private@example.test secret-value not found"), { code: "data-connect/not-found" });
    const sdkWithStatus = Object.assign(new Error("private@example.test secret-value"), { code: "data-connect/internal", statusCode: 503 });
    for (const [error, expected] of [[database, 409], [provider, 502], [sdk, 502], [sdkWithStatus, 502]] as const) {
      const response = apiErrorResponse(error);
      assert.equal(response.status, expected);
      assert.doesNotMatch(JSON.stringify(await response.json()), /private@example|secret-value/);
    }
    assert.doesNotMatch(JSON.stringify(logged), /private@example|secret-value/);
    // Intentional application errors must retain their status and safe explanation.
    const message = "Data Connect経由の更新は停止しています。";
    const guarded = apiErrorResponse(Object.assign(new Error(message), { statusCode: 503 }));
    assert.equal(guarded.status, 503);
    assert.equal((await guarded.json()).error, message);
  } finally { console.error = original; }
});

test("invalid error statuses cannot turn an exception into a successful response", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    for (const statusCode of [200, 204, 302, 0, 700, 400.5, NaN]) {
      const response = apiErrorResponse(Object.assign(new Error("secret-value"), { statusCode }));
      assert.equal(response.status, 500);
      assert.doesNotMatch(JSON.stringify(await response.json()), /secret-value/);
    }
  } finally { console.error = original; }
});
