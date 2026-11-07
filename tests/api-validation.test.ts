import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorResponse } from "../lib/api-validation";

test("PostgreSQL errors return safe messages instead of SQL parameters", async () => {
  for (const [code, status] of [["23505",409],["23503",409],["23502",400],["22P02",400],["22001",400],["ECONNREFUSED",503]] as const) {
    const error = new Error("Failed query with private@example.test and database password", { cause: Object.assign(new Error("private database detail"), { code }) });
    const original = console.error;
    console.error = () => {};
    try {
      const response = apiErrorResponse(error);
      assert.equal(response.status, status);
      assert.doesNotMatch(JSON.stringify(await response.json()), /private|password/);
    } finally { console.error = original; }
  }
  const original = console.error;
  console.error = () => {};
  try {
    const failure = Object.assign(new Error("Failed query with private@example.test"), { query: "select private data", params: ["password"] });
    const response = apiErrorResponse(failure);
    assert.equal(response.status, 503);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private|password/);
  } finally { console.error = original; }
});

test("Data Connect errors do not disclose provider details in responses or logs", async () => {
  const error = new Error("partial-error private@example.test secret-credential");
  error.name = "DataConnectOperationError";
  Object.assign(error, {
    response: {
      errors: [{ message: "Cannot update reservation private@example.test secret-value" }],
    },
  });
  const originalConsoleError = console.error;
  const logs: unknown[][] = [];
  console.error = (...values: unknown[]) => { logs.push(values); };

  try {
    const response = apiErrorResponse(error);
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(body), /private@example|secret-value|secret-credential/);
    assert.doesNotMatch(JSON.stringify(logs), /private@example|secret-value|secret-credential/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("missing deployed Data Connect operations return a safe service error", async () => {
  const error = new Error('operation "GetAccountByFirebaseUid" not found');
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = apiErrorResponse(error);
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.doesNotMatch(body.error, /GetAccountByFirebaseUid|firebase deploy/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("untyped infrastructure errors cannot expose details through not-found or conflict matching", async () => {
  for (const [message, status] of [["private@example.test not found", 404], ["secret-value already exists", 409]] as const) {
    const response = apiErrorResponse(new Error(message));
    assert.equal(response.status, status);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private@example|secret-value/);
  }
});
