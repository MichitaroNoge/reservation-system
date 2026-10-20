import assert from "node:assert/strict";
import { test } from "node:test";
import { completeCustomerRegistration } from "../lib/customer-registration";

test("profile persistence failure must not send a registration confirmation", async () => {
  let sent = false;
  await assert.rejects(completeCustomerRegistration({ uid: "new-user" }, async () => {
    throw new Error("database unavailable");
  }, async () => { sent = true; }), /database unavailable/);
  assert.equal(sent, false);
});

test("email failure leaves the profile saved for account management", async () => {
  const saved: string[] = [];
  await assert.rejects(completeCustomerRegistration({ uid: "new-user" }, async user => {
    saved.push(user.uid);
  }, async () => { throw new Error("email unavailable"); }), /email unavailable/);
  assert.deepEqual(saved, ["new-user"]);
});
