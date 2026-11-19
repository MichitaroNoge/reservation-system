import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../../lib/db/client";
import { account, accountDeletion, emailDelivery, inquiry, transactionalMailJob } from "../../lib/db/schema";
import * as controller from "../../lib/inquiries/controllers";
import { InquiryRepository } from "../../lib/inquiries/repository";
import { createCalendarFixture } from "./calendar-fixture";

const uid = "calendar-test-user";
const form = () => ({ name: "本人", email: `${randomUUID()}@example.test`, category: "other" as const, subject: "質問", body: "問い合わせ本文", requestKey: randomUUID() });
const request = (body?: object, admin = false) => new Request("http://localhost/api/inquiries", {
  method: body ? "POST" : "GET",
  headers: { origin: "http://localhost", authorization: `Bearer calendar-test-${admin ? "admin" : "member"}`, ...(body ? { "content-type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

test("inquiry creation waits for concurrent account deactivation before checking access", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const fixture = await createCalendarFixture();
  const db = await getDatabase(), repository = new InquiryRepository(db);
  let creation: Promise<unknown> | undefined;
  try {
    const customer = await fixture.repo.createAccount({ firebaseUid: uid, name: "本人", contact: "owner@example.test", phone: "09012345678" });
    assert.ok(customer.id);
    const customerId = customer.id;
    await db.transaction(async tx => {
      const owner = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`account:${uid}`},0))`);
      await tx.update(account).set({ active: false }).where(eq(account.id, customerId));
      // Attach both handlers immediately, even when a failed assertion rolls this transaction back.
      creation = repository.create(form(), `user:${uid}`, uid, null, []).then(value => ({ value }), error => ({ error }));
      const deadline = Date.now() + 5000;
      while (true) {
        const waiting = await db.execute<{ waiting: boolean }>(sql`select exists(select 1 from pg_stat_activity where ${owner.rows[0].pid} = any(pg_blocking_pids(pid)) and wait_event = 'advisory') as waiting`);
        if (waiting.rows[0].waiting) break;
        assert.ok(Date.now() < deadline, "inquiry creation must wait on the same account transaction lock");
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal((await tx.select().from(inquiry)).length, 0);
    });
    const result = await creation as { error?: { statusCode: number; message: string } };
    assert.equal(result.error?.statusCode, 403);
    assert.match(result.error.message, /無効化/);
    assert.equal((await db.select().from(inquiry)).length, 0);
    assert.equal((await db.select().from(transactionalMailJob)).length, 0);
  } finally { await creation; await fixture.close(); }
});
async function response(result: Response, status: number) {
  const body = await result.json();
  assert.equal(result.status, status, JSON.stringify(body));
  return body;
}

test("disabled customers cannot submit or view inquiries; reactivation preserves history and admin access", async () => {
  const fixture = await createCalendarFixture();
  const db = await getDatabase(), repository = new InquiryRepository(db);
  try {
    const customer = await fixture.repo.createAccount({ firebaseUid: uid, name: "本人", contact: "owner@example.test", phone: "09012345678" });
    assert.ok(customer.id);
    const booking = await fixture.repo.createReservation({ name: "本人", email: "owner@example.test", phone: "09012345678", date: "2099-11-15", startTime: "12:00", people: 10, menuItems: ["検証メニュー"], status: "temporary_confirmed", accountFirebaseUid: uid });
    const original = form();
    const accepted = await response(await controller.submit(request(original)), 201);
    const related = await response(await controller.submit(request(form()), booking.id), 201);
    const stored = async () => ({ inquiries: await db.select().from(inquiry), deliveries: await db.select().from(emailDelivery), jobs: await db.select().from(transactionalMailJob) });
    const before = await stored();
    await fixture.repo.deactivateAccount(customer.id);

    for (const attempt of [
      () => controller.myInquiries(request()),
      () => controller.myInquiries(request(), accepted.number),
      () => controller.myInquiries(request(), related.number),
      () => controller.reservationContext(request(), booking.id),
      () => controller.reservationInquiryHistory(request(), booking.id),
      () => controller.submit(request(form())),
      () => controller.submit(request(form()), booking.id),
      () => controller.submit(request(original)), // A previously accepted idempotency key cannot bypass the gate.
    ]) {
      const denied = await response(await attempt(), 403);
      assert.match(denied.error, /無効化/);
    }
    assert.deepEqual(await stored(), before);
    const adminDetail = await response(await controller.adminInquiries(request(undefined, true), accepted.number), 200);
    assert.equal(adminDetail.inquiry.number, accepted.number);
    await response(await controller.reply(request({ subject: "回答", body: "無効化中に管理者が保存した回答", requestKey: randomUUID(), revision: adminDetail.inquiry.revision }, true), accepted.number), 200);
    assert.equal((await response(await controller.reservationInquiryHistory(request(undefined, true), booking.id, true), 200)).total, 1);
    // Anonymous access remains separate; no real mail is dispatched by this repository call.
    await repository.create(form(), "anonymous:test", null, null, []);

    await fixture.repo.reactivateAccount(customer.id);
    assert.equal((await response(await controller.myInquiries(request()), 200)).total, 2);
    const restored = await response(await controller.myInquiries(request(), accepted.number), 200);
    assert.equal(restored.inquiry.number, accepted.number);
    assert.equal(restored.replies[0].body, "無効化中に管理者が保存した回答");
    await response(await controller.submit(request(form())), 201);
    assert.equal((await response(await controller.myInquiries(request()), 200)).total, 3);
  } finally { await fixture.close(); }
});

test("profileless verified users retain inquiry access, while account deletion markers deny it", async () => {
  const fixture = await createCalendarFixture();
  const db = await getDatabase();
  try {
    const original = form();
    const accepted = await response(await controller.submit(request(original)), 201);
    assert.equal((await response(await controller.myInquiries(request()), 200)).total, 1);
    for (const completedAt of [null, new Date().toISOString()]) {
      await db.insert(accountDeletion).values({ firebaseUid: uid, completedAt }).onConflictDoUpdate({ target: accountDeletion.firebaseUid, set: { completedAt } });
      for (const attempt of [
        () => controller.submit(request(form())),
        () => controller.submit(request(original)),
        () => controller.myInquiries(request()),
        () => controller.myInquiries(request(), accepted.number),
      ]) assert.match((await response(await attempt(), 403)).error, /削除/);
    }
    assert.equal((await db.select().from(inquiry)).length, 1);
    await response(await controller.adminInquiries(request(undefined, true), accepted.number), 200);
  } finally { await fixture.close(); }
});
