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

test("Data Connect errors are returned with actionable messages", async () => {
  const error = new Error("partial-error");
  error.name = "DataConnectOperationError";
  Object.assign(error, {
    response: {
      errors: [{ message: "Cannot update reservation" }],
    },
  });
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = apiErrorResponse(error);
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error, "Data Connectの更新に失敗しました: Cannot update reservation");
  } finally {
    console.error = originalConsoleError;
  }
});

test("missing deployed Data Connect operations are explained", async () => {
  const error = new Error('operation "GetAccountByFirebaseUid" not found');
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = apiErrorResponse(error);
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error, "Data Connectの更新に失敗しました: Data Connectに GetAccountByFirebaseUid が反映されていません。firebase dataconnect:sdk:generate と firebase deploy --only dataconnect を実行してください。");
  } finally {
    console.error = originalConsoleError;
  }
});
