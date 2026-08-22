import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorResponse } from "../lib/api-validation";

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
