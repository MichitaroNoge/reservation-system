import assert from "node:assert/strict";
import { test } from "node:test";
import { FirebaseSqlConnectReservationRepository } from "../lib/repositories/firebase-sql-connect-repository";

test("legacy Data Connect cannot silently execute a non-atomic write callback", async () => {
  let called = false;
  const repository = new FirebaseSqlConnectReservationRepository();
  await assert.rejects(repository.withTransaction("account:test", async () => { called = true; }), (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 503);
  assert.equal(called, false);
});
