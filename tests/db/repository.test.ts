import { cancellationPolicyVersion } from "../../lib/cancellation-policy-consent";
import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { DrizzleReservationRepository, type ReservationDatabase } from "../../lib/repositories/drizzle-reservation-repository";
import { assertLocalDatabase } from "../../lib/db/environment";
import { seedDatabase } from "../../lib/db/seed";
import * as schema from "../../lib/db/schema";
import { ApiAuthError, getFirebaseAdminApp, requireAdmin } from "../../lib/auth";
import { findOwnedReservationByAuthenticatedCustomer } from "../../lib/customer-reservation-access";
import { repositoryTransaction } from "../../lib/repositories/transaction";
import { saveConfirmationContact, saveReservationAssignments, saveReservationDetails } from "../../lib/services/reservation-update-service";
import { consumeDatabaseLimits } from "../../lib/db/abuse-limit-store";
import { validateUpdateReservationInput } from "../../lib/api-validation";
import { createReservationOnce } from "../../lib/services/reservation-submission-service";
import { RateLimitError } from "../../lib/abuse-limits";

let db:ReservationDatabase;
let repo:DrizzleReservationRepository;
let close:()=>Promise<void>;
const input = { name:"予約者", email:"customer@example.test", phone:"09000000000", date:"2026-11-15", startTime:"13:00", people:5, menuItems:["テストメニュー"], status:"confirmed" as const };
before(async()=>{
  if(process.env.DB_TEST_DRIVER === "postgres") {
    if (process.env.DB_TEST_RESET_CONFIRM !== "reservation_system_test") throw new Error("Run test:db:postgres with the explicit local test database confirmation.");
    const url=process.env.TEST_DATABASE_URL;
    assertLocalDatabase({APP_ENV:"test",DATABASE_URL:url});
    const pool=new Pool({connectionString:url,max:5,connectionTimeoutMillis:5000});
    // Explicit isolated test DB only. This suite clears its data; never the development DB.
    await pool.query("DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    db=drizzle(pool,{schema});
    await migrate(db,{migrationsFolder:resolve("drizzle")});
    await migrate(db,{migrationsFolder:resolve("drizzle")});
    close=()=>pool.end();
  } else {
    const client=new PGlite();
    const embedded=pgliteDrizzle(client,{schema});
    await pgliteMigrate(embedded,{migrationsFolder:resolve("drizzle")});
    await pgliteMigrate(embedded,{migrationsFolder:resolve("drizzle")});
    // Same PostgreSQL dialect and schema; only the test driver's result envelope differs.
    db=embedded as unknown as ReservationDatabase;
    close=()=>client.close();
  }
  repo=new DrizzleReservationRepository(db);
  await repo.createMenu({name:"テストメニュー",description:"サンプル",price:1200,duration:"45分",displayOrder:1});
  await repo.createStore({name:"テスト店",displayOrder:1});
});

after(async()=>{
  mock.restoreAll();
  if(close)await close();
  const runtime = globalThis as typeof globalThis & { reservationDatabase?: { pool: Pool } };
  await runtime.reservationDatabase?.pool.end();
});

test("migration contains all 17 legacy tables and the existing enum definitions",()=>{
  const journal=JSON.parse(readFileSync("drizzle/meta/_journal.json","utf8"));
  const sqlText=readFileSync(`drizzle/${journal.entries[0].tag}.sql`,"utf8");
  assert.equal((sqlText.match(/CREATE TABLE/g)??[]).length,17);
  assert.equal((sqlText.match(/CREATE TYPE/g)??[]).length,4);
});

test("seed is repeatable, preserves edited templates and links the specified Firebase UID",async()=>{
  await seedDatabase(db,"seed-firebase-uid");
  const first=await repo.listReservations();
  const accounts=await repo.listAccounts();
  const template=(await repo.listEmailTemplates())[0];
  await repo.upsertEmailTemplate({...template,subject:"編集済み件名"});
  await seedDatabase(db,"seed-firebase-uid");
  assert.equal((await repo.listReservations()).length,first.length);
  assert.equal((await repo.listAccounts()).length,accounts.length);
  assert.equal((await repo.getEmailTemplate(template.templateKey))?.subject,"編集済み件名");
  assert.ok((await repo.listReservationsForReservationAccount("seed-firebase-uid")).length>0);
});

test("Account and reservation snapshots stay separate; ownership is restricted by Firebase UID",async()=>{
  const account=await repo.createAccount({firebaseUid:"owner-uid",name:"会員",contact:input.email});
  const own=await repo.createReservation({...input,accountFirebaseUid:"owner-uid"});
  const admin=await repo.createReservation(input);
  assert.equal(admin.accountId,null);
  assert.equal(own.accountId,account.id);
  await repo.updateAccount(account.id!,{name:"変更したプロフィール",contact:"new@example.test"});
  assert.equal((await repo.listReservations()).find(item=>item.id===own.id)?.customer,input.name);
  const owned=await repo.listReservationsForReservationAccount("owner-uid");
  assert.ok(owned.some(item=>item.id===own.id));assert.ok(!owned.some(item=>item.id===admin.id));
  assert.deepEqual(await repo.listReservationsForReservationAccount("other-uid"),[]);
  await repo.deactivateAccount(account.id!);
  assert.deepEqual(await repo.listReservationsForReservationAccount("owner-uid"),[]);
  await repo.reactivateAccount(account.id!);
});

test("new reservations, details and store assignments match API values; invalid replacements roll back",async()=>{
  const reservation=await repo.createReservation(input);
  assert.equal(reservation.endTime,"13:45");assert.equal(reservation.totalAmount,1200);assert.deepEqual(reservation.menuItems,input.menuItems);
  await repo.assignStores(reservation.id,[{store:"テスト店",people:5}]);
  await repo.updateConfirmationContact(reservation.id,"2026-11-01T00:00:00.000Z");
  await assert.rejects(repo.assignStores(reservation.id,[{store:"存在しない店舗",people:5}]));
  const current=(await repo.listReservations()).find(item=>item.id===reservation.id)!;
  assert.deepEqual(current.storeAssignments,[{store:"テスト店",people:5}]);assert.ok(current.confirmationContactedAt);
  assert.equal(current.confirmationContactedAt,"2026-11-01T00:00:00.000Z");
  assert.match(current.received,/Z$/);
  await assert.rejects(repo.assignStores(reservation.id,[{store:"テスト店",people:4}]),/Assigned people/);
  // Trigger a genuine DB failure after the reservation UPDATE but before detail insertion completes.
  await db.execute(sql.raw("CREATE FUNCTION fail_test_detail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test detail failure'; END $$"));
  await db.execute(sql.raw("CREATE TRIGGER fail_test_detail BEFORE INSERT ON reservation_detail FOR EACH ROW EXECUTE FUNCTION fail_test_detail()"));
  try {
    await assert.rejects(repo.updateReservation(reservation.id,{date:"2026-11-16",menuItems:input.menuItems}));
    const rolledBack=(await repo.listReservations()).find(item=>item.id===reservation.id)!;
    assert.equal(rolledBack.date,input.date);assert.deepEqual(rolledBack.menuItems,input.menuItems);assert.ok(rolledBack.confirmationContactedAt);
  } finally {await db.execute(sql.raw("DROP TRIGGER fail_test_detail ON reservation_detail"));await db.execute(sql.raw("DROP FUNCTION fail_test_detail()"));}
  const updated=await repo.updateReservation(reservation.id,{date:"2026-11-16",startTime:"14:00",menuItems:input.menuItems});
  assert.equal(updated.endTime,"14:45");assert.equal(updated.confirmationContactedAt,null);
});

test("change approval is atomic and can only be reviewed once",async()=>{
  const reservation=await repo.createReservation(input);
  await repo.assignStores(reservation.id,[{store:"テスト店",people:5}]);
  await repo.updateConfirmationContact(reservation.id,"2026-11-01T00:00:00.000Z");
  const requestInput={reservationId:reservation.id,email:input.email,requestedDate:"2026-11-20",requestedStartTime:"15:00",requestedPeople:6,requestedMenuItems:input.menuItems,reason:"予定変更"};
  const request=await repo.createReservationChangeRequest(requestInput);
  assert.equal((await repo.createReservationChangeRequest(requestInput)).id,request.id);
  await db.execute(sql.raw("CREATE FUNCTION fail_test_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test review failure'; END $$"));
  await db.execute(sql.raw("CREATE TRIGGER fail_test_review BEFORE UPDATE ON reservation_change_request FOR EACH ROW EXECUTE FUNCTION fail_test_review()"));
  try {
    await assert.rejects(repo.approveReservationChangeRequest(request.id));
    const rolledBack=(await repo.listReservations()).find(item=>item.id===reservation.id)!;
    assert.equal(rolledBack.people,5);assert.equal(rolledBack.date,input.date);assert.equal(rolledBack.storeAssignments?.length,1);assert.ok(rolledBack.confirmationContactedAt);
    assert.equal((await repo.listReservationChangeRequests()).find(item=>item.id===request.id)?.status,"requested");
  } finally {await db.execute(sql.raw("DROP TRIGGER fail_test_review ON reservation_change_request"));await db.execute(sql.raw("DROP FUNCTION fail_test_review()"));}
  const approved=await repo.approveReservationChangeRequest(request.id);
  assert.equal(approved.request.status,"approved");assert.equal(approved.reservation.people,6);assert.equal(approved.reservation.date,"2026-11-20");assert.deepEqual(approved.reservation.storeAssignments,[]);assert.equal(approved.reservation.confirmationContactedAt,null);
  await assert.rejects(repo.rejectReservationChangeRequest(request.id),/already reviewed/);
  const reject=await repo.createReservationChangeRequest({...requestInput,requestedPeople:7});
  assert.equal((await repo.rejectReservationChangeRequest(reject.id)).status,"rejected");
});

test("new account plus reservation transaction rolls back on reservation failure",async()=>{
  await assert.rejects(repositoryTransaction(repo,"account:failed-uid",async tx=>{
    await tx.createAccount({firebaseUid:"failed-uid",name:"失敗する会員",contact:input.email});
    return tx.createReservation({...input,accountFirebaseUid:"failed-uid",people:null as unknown as number});
  }));
  assert.equal(await repo.findAccountByFirebaseUid("failed-uid"),null);
});

test("email snapshots, idempotency, receipt/approval state and settings survive persistence",async()=>{
  const reservation=await repo.createReservation(input);
  const template=await repo.upsertEmailTemplate({templateKey:"test-email",name:"テスト",subject:"件名",body:"本文",isActive:true});
  assert.equal((await repo.getEmailTemplate("test-email"))?.id,template.id);
  const delivery=await repo.createEmailDelivery({deliveryKey:"test-delivery",reservationId:reservation.id,templateKey:"test-email",recipient:input.email,subject:"初回件名",body:"初回本文",status:"pending",requestedAt:"2026-11-01T00:00:00.000Z"});
  const retry=await repo.createEmailDelivery({...delivery,subject:"上書きしてはいけない件名"});
  assert.equal(retry.subject,"初回件名");
  assert.equal((await repo.updateEmailDelivery(delivery.deliveryKey,{status:"sent",sentAt:"2026-11-02T00:00:00.000Z",lastError:null})).status,"sent");
  const receipt=await repo.updateReceiptEmailDelivery(reservation.id,{lastAttemptAt:"2026-11-02T00:00:00.000Z",retryCount:1,lastError:"retry"});
  assert.equal(receipt.receiptEmailRetryCount,1);
  const approval=await repo.createApprovalEmailDelivery({deliveryKey:"approval-test",reservationId:reservation.id,type:"reservation_approved",requestedAt:"2026-11-01T00:00:00.000Z"});
  assert.equal((await repo.createApprovalEmailDelivery({deliveryKey:"approval-test",reservationId:reservation.id,type:"reservation_approved",requestedAt:"2026-11-01T00:00:00.000Z"})).id,approval.id);
  assert.equal((await repo.updateApprovalEmailDelivery("approval-test",{lastAttemptAt:"2026-11-02T00:00:00.000Z",retryCount:1,lastError:"test"})).retryCount,1);
  await repo.upsertEmailSettings({settingKey:"default",senderName:"テスト送信者",fromEmail:"sender@example.test",replyToEnabled:false});
  assert.equal((await repo.getEmailSettings())?.senderName,"テスト送信者");
});

test("contact verification tokens and soft-deleted catalogs preserve historical reservations",async()=>{
  const account=await repo.createAccount({firebaseUid:"contact-uid",name:"連絡先",contact:input.email});
  const contact=await repo.createAccountContactEmail({accountId:account.id!,email:"additional@example.test",verificationTokenHash:"a".repeat(64),verificationExpiresAt:"2026-11-02T00:00:00.000Z"});
  assert.equal((await repo.findAccountContactEmailByToken("a".repeat(64)))?.firebaseUid,"contact-uid");
  await repo.verifyAccountContactEmail(contact.id,"2026-11-01T00:00:00.000Z");assert.ok((await repo.listAccountContactEmails(account.id!))[0].verifiedAt);
  await assert.rejects(repo.createAccountContactEmail({accountId:account.id!,email:"additional@example.test",verificationTokenHash:"b".repeat(64),verificationExpiresAt:"2026-11-02T00:00:00.000Z"}),/登録済み/);
  await repo.deleteAccountContactEmail(contact.id);assert.equal((await repo.listAccountContactEmails(account.id!)).length,0);
  const reservation=await repo.createReservation(input);await repo.assignStores(reservation.id,[{store:"テスト店",people:5}]);
  await repo.deleteMenu("テストメニュー");await repo.deleteStore("テスト店");
  const historical=(await repo.listReservations()).find(item=>item.id===reservation.id)!;
  assert.deepEqual(historical.menuItems,input.menuItems);assert.equal(historical.store,"テスト店");
  const menu=(await repo.listInactiveMenus()).find(item=>item.name==="テストメニュー")!;
  const store=(await repo.listInactiveStores()).find(item=>item.name==="テスト店")!;
  await repo.reactivateMenu(menu.id!);await repo.reactivateStore(store.id!);
  await repo.updateMenu("テストメニュー",{name:"テストメニュー",description:"更新",price:1500,duration:"60分",displayOrder:2});
  await repo.updateStore("テスト店",{name:"テスト店",displayOrder:2});
  assert.equal((await repo.listReservations()).find(item=>item.id===reservation.id)?.totalAmount,1200);
});

test("ID token validation, admin claims and reservation owner checks remain enforced",async()=>{
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID="local-test-project";
  const auth=getAuth(getFirebaseAdminApp());
  let tokenUser={uid:"owner-uid",email_verified:true,admin:false,role:"user"};
  const verification=mock.method(auth,"verifyIdToken",async(token:string)=>{
    if(token!=="valid-token")throw new Error("invalid token");
    return tokenUser;
  });
  const request=new Request("http://localhost/test",{headers:{authorization:"Bearer valid-token"}});
  const own=(await repo.listReservationsForReservationAccount("owner-uid"))[0];
  try {
    await assert.rejects(findOwnedReservationByAuthenticatedCustomer(new Request("http://localhost/test"),repo,own.id),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===401);
    await assert.rejects(findOwnedReservationByAuthenticatedCustomer(new Request("http://localhost/test",{headers:{authorization:"Bearer invalid-token"}}),repo,own.id),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===401);
    assert.equal((await findOwnedReservationByAuthenticatedCustomer(request,repo,own.id)).id,own.id);
    tokenUser={...tokenUser,uid:"other-uid"};
    await assert.rejects(findOwnedReservationByAuthenticatedCustomer(request,repo,own.id),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===403);
    tokenUser={...tokenUser,uid:"owner-uid",email_verified:false};
    await assert.rejects(findOwnedReservationByAuthenticatedCustomer(request,repo,own.id),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===403);
    tokenUser={...tokenUser,email_verified:true};
    await assert.rejects(requireAdmin(new Request("http://localhost/test",{headers:{authorization:"Bearer invalid-token"}})),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===401);
    await assert.rejects(requireAdmin(request),(error:unknown)=>error instanceof ApiAuthError&&error.statusCode===403);
    tokenUser={...tokenUser,admin:true};assert.equal((await requireAdmin(request)).uid,"owner-uid");
    tokenUser={...tokenUser,admin:false,role:"admin"};assert.equal((await requireAdmin(request)).uid,"owner-uid");
  } finally {verification.mock.restore();}
});

test("PostgreSQL rejects invalid enums, missing required fields, foreign keys and duplicate unique keys",async()=>{
  await assert.rejects(db.insert(schema.reservation).values({reservationCode:"INVALID-ENUM",usageDate:input.date,usageTime:"10:00",expectedPeople:1,status:"INVALID" as "CONFIRMED"}));
  await assert.rejects(db.insert(schema.account).values({firebaseUid:"missing-name",email:input.email,name:null as unknown as string}));
  await assert.rejects(db.insert(schema.storeAssignment).values({reservationId:"00000000-0000-4000-8000-000000000000",storeId:"00000000-0000-4000-8000-000000000000",people:1}));
  const account=await repo.findAccountByFirebaseUid("owner-uid");
  await assert.rejects(db.insert(schema.account).values({firebaseUid:"owner-uid",name:"duplicate",email:input.email}));
  assert.ok(account);
});

test("cancellation and confirmed request status fields remain unchanged",async()=>{
  const reservation=await repo.createReservation({...input,status:"temporary_confirmed"});
  const confirmed=await repo.updateReservationStatus(reservation.id,"confirmed_requested",{requestType:"confirmed_from_temporary"});
  assert.equal(confirmed.requestType,"confirmed_from_temporary");
  const cancelled=await repo.updateReservationStatus(reservation.id,"cancellation_requested");
  assert.equal(cancelled.requestType,null);
  assert.equal((await repo.updateReservationStatus(reservation.id,"cancelled")).status,"cancelled");
});

test("concurrent PostgreSQL connections allocate distinct codes and serialize competing reviews",{skip:process.env.DB_TEST_DRIVER!=="postgres"},async()=>{
  const reservations=await Promise.all(Array.from({length:10},()=>repo.createReservation(input)));
  assert.equal(new Set(reservations.map(item=>item.id)).size,10);
  const request=await repo.createReservationChangeRequest({reservationId:reservations[0].id,email:input.email,requestedDate:input.date,requestedStartTime:"14:00",requestedPeople:5,requestedMenuItems:input.menuItems});
  const reviews=await Promise.allSettled([repo.approveReservationChangeRequest(request.id),repo.rejectReservationChangeRequest(request.id)]);
  assert.equal(reviews.filter(item=>item.status==="fulfilled").length,1);
});

test("editing a booking preserves booked prices and inactive menu selections", async () => {
  const name = "価格保持メニュー";
  await repo.createMenu({ name, description: "", price: 1200, duration: "45分", displayOrder: 9 });
  const reservation = await repo.createReservation({ ...input, menuItems: [name] });
  await repo.updateMenu(name, { name, description: "", price: 2500, duration: "45分", displayOrder: 9 });
  assert.equal((await repo.updateReservation(reservation.id, { menuItems: [name], remarks: "追記" })).totalAmount, 1200);
  await repo.deleteMenu(name);
  const updated = await repo.updateReservation(reservation.id, { menuItems: [name], remarks: "再編集" });
  assert.deepEqual(updated.menuItems, [name]);
  assert.equal(updated.totalAmount, 1200);
  await assert.rejects(repo.updateReservation(reservation.id, { people: 9, menuItems: ["存在しないメニュー"] }), /見つかりません/);
  assert.equal((await repo.listReservations()).find(item => item.id === reservation.id)?.people, input.people);
});

test("server mutations persist readiness and clear outdated assignments atomically", async () => {
  const reservation = await repo.createReservation(input);
  await saveReservationAssignments(repo, reservation.id, { assignments: [{ store: "テスト店", people: 5 }] });
  assert.equal((await saveConfirmationContact(repo, reservation.id, "2026-11-01T00:00:00Z")).status, "waiting_for_visit");
  const updated = await saveReservationDetails(repo, reservation.id, { people: 7, date: "2026-11-16" });
  assert.equal(updated.status, "confirmed");
  assert.equal(updated.confirmationContactedAt, null);
  assert.deepEqual(updated.storeAssignments, []);
  assert.equal((await repo.listReservations()).find(item => item.id === reservation.id)?.status, "confirmed");
});

test("cancelled bookings reject pending change approvals without modifying details", async () => {
  const reservation = await repo.createReservation(input);
  const request = await repo.createReservationChangeRequest({ reservationId: reservation.id, email: input.email, requestedDate: "2026-11-17", requestedStartTime: "14:00", requestedPeople: 9, requestedMenuItems: input.menuItems });
  await repo.updateReservationStatus(reservation.id, "cancelled");
  await assert.rejects(repo.approveReservationChangeRequest(request.id), /変更を承認できません/);
  assert.equal((await repo.listReservations()).find(item => item.id === reservation.id)?.date, input.date);
  assert.equal((await repo.listReservationChangeRequests()).find(item => item.id === request.id)?.status, "requested");
});

test("approval and its retryable email record roll back together when outbox persistence fails", async () => {
  const reservation = await repo.createReservation({ ...input, status: "confirmed_requested" });
  await db.execute(sql.raw("CREATE FUNCTION review_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.delivery_key LIKE 'review-failure/%' THEN RAISE EXCEPTION 'outbox failure'; END IF; RETURN NEW; END $$;"));
  await db.execute(sql.raw("CREATE TRIGGER review_outbox_failure BEFORE INSERT ON approval_email_delivery FOR EACH ROW EXECUTE FUNCTION review_outbox_failure();"));
  try {
    await assert.rejects(repositoryTransaction(repo, `reservation:${reservation.id}`, async transaction => {
      await transaction.updateReservationStatus(reservation.id, "confirmed");
      await transaction.createApprovalEmailDelivery({ deliveryKey: `review-failure/${reservation.id}`, reservationId: reservation.id, type: "reservation_approved", requestedAt: new Date().toISOString() });
    }));
    assert.equal((await repo.listReservations()).find(item => item.id === reservation.id)?.status, "confirmed_requested");
  } finally {
    await db.execute(sql.raw("DROP TRIGGER review_outbox_failure ON approval_email_delivery;"));
    await db.execute(sql.raw("DROP FUNCTION review_outbox_failure();"));
  }
});

test("concurrent people changes and store assignment saves never leave a mismatched total", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const reservation = await repo.createReservation(input);
  await Promise.allSettled([
    saveReservationDetails(repo, reservation.id, { people: 7 }),
    saveReservationAssignments(repo, reservation.id, { assignments: [{ store: "テスト店", people: 5 }] }),
  ]);
  const current = (await repo.listReservations()).find(item => item.id === reservation.id)!;
  assert.equal(current.people, 7);
  assert.deepEqual(current.storeAssignments, []);
});

test("PostgreSQL saves cleared reservation fields while preserving omitted fields", async () => {
  const reservation = await repo.createReservation({ ...input, address: "旧住所", groupNameKana: "カナ", dayContactPhone: "09000000000", remarks: "備考" });
  await saveReservationDetails(repo, reservation.id, validateUpdateReservationInput({ address: " ", groupNameKana: "", dayContactPhone: "" }));
  const saved = (await repo.listReservations()).find(item => item.id === reservation.id)!;
  assert.equal(saved.address ?? "", ""); assert.equal(saved.groupNameKana ?? "", ""); assert.equal(saved.dayContactPhone ?? "", "");
  assert.equal(saved.remarks, "備考"); assert.equal(saved.phone, input.phone);
});

test("deletion guards block profile resurrection without creating a fabricated account", async () => {
  const uid = "review-deletion-guard";
  const count = (await repo.listAccounts()).length;
  await repositoryTransaction(repo, `account:${uid}`, transaction => transaction.recordAccountDeletion!(uid));
  await assert.rejects(repo.createAccount({ firebaseUid: uid, name: "復活", contact: "guard@example.test" }), /削除/);
  assert.equal((await repo.listAccounts()).length, count);
  await repo.recordAccountDeletion(uid, new Date().toISOString());
  await assert.rejects(repo.createAccount({ firebaseUid: uid, name: "復活", contact: "guard@example.test" }), /削除/);
});

test("durable submission keys replay one reservation and reject changed content or disabled owners", async () => {
  const uid = "review-submission-user";
  const account = await repo.createAccount({ firebaseUid: uid, name: "再送テスト", contact: input.email });
  const key = "review-submission-key";
  const first = await createReservationOnce(repo, uid, key, input, transaction => transaction.createReservation({ ...input, accountFirebaseUid: uid }));
  const retry = await createReservationOnce(new DrizzleReservationRepository(db), uid, key, input, () => { throw new Error("must not create again"); });
  assert.equal(retry.id, first.id);
  await assert.rejects(createReservationOnce(repo, uid, key, { ...input, people: 7 }, transaction => transaction.createReservation(input)), /内容が変更/);
  assert.equal((await repo.listReservationsForReservationAccount(uid)).length, 1);
  await repo.deactivateAccount(account.id!);
  await assert.rejects(createReservationOnce(repo, uid, key, input, transaction => transaction.createReservation(input)), /無効化/);
});

test("concurrent reservation retries create one booking across database connections", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const uid = "review-concurrent-submission";
  const before = (await repo.listReservations()).length;
  const results = await Promise.all(Array.from({ length: 5 }, () => createReservationOnce(new DrizzleReservationRepository(db), uid, "concurrent-submission-key", input, transaction => transaction.createReservation(input))));
  assert.equal(new Set(results.map(reservation => reservation.id)).size, 1);
  assert.equal((await repo.listReservations()).length, before + 1);
});

test("a failed submission transaction leaves neither its reservation nor its key behind", async () => {
  const uid = "review-submission-rollback";
  const before = (await repo.listReservations()).length;
  await assert.rejects(createReservationOnce(repo, uid, "rollback-submission-key", input, async transaction => {
    await transaction.createReservation(input);
    throw new Error("interrupted transaction");
  }), /interrupted/);
  assert.equal((await repo.listReservations()).length, before);
  assert.equal(await repo.getReservationSubmission(uid, "rollback-submission-key"), null);
});

test("PostgreSQL rate limits persist counters, reset expiry and roll back all buckets on denial", async () => {
  const limit = { key: "review:limit", max: 2, seconds: 60 };
  assert.equal((await consumeDatabaseLimits(db, [limit], 1000))[0].count, 1);
  assert.equal((await consumeDatabaseLimits(db, [limit], 1001))[0].count, 2);
  await assert.rejects(consumeDatabaseLimits(db, [{ key: "review:rollback", max: 5, seconds: 60 }, limit], 1002), error => error instanceof RateLimitError);
  const hash = createHash("sha256").update("review:rollback").digest("hex");
  const counters = await db.select().from(schema.abuseLimit);
  assert.equal(counters.some(counter => counter.bucketKey === hash), false);
  assert.equal((await consumeDatabaseLimits(db, [limit], 61001))[0].count, 1);
});

test("concurrent connections cannot exceed a PostgreSQL rate-limit bucket", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const limit = { key: "review:concurrent-limit", max: 3, seconds: 60 };
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => consumeDatabaseLimits(db, [limit])));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 3);
  assert.equal(results.filter(result => result.status === "rejected" && result.reason instanceof RateLimitError).length, 9);
});

test("authenticated profile API saves to PostgreSQL without depending on Firestore", { skip: process.env.DB_TEST_DRIVER !== "postgres" }, async () => {
  const savedEnvironment = { APP_ENV: process.env.APP_ENV, DB_PROVIDER: process.env.DB_PROVIDER, DATABASE_URL: process.env.DATABASE_URL, RESEND_API_KEY: process.env.RESEND_API_KEY, RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL };
  process.env.APP_ENV = "test";
  process.env.DB_PROVIDER = "drizzle";
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // No external emails are sent by this API integration test.
  process.env.RESEND_API_KEY = "";
  process.env.RESEND_FROM_EMAIL = "";
  const auth = getAuth(getFirebaseAdminApp());
  let verified = false;
  let admin = false;
  let uid = "review-api-user";
  let email = "review@example.test";
  let authenticatedAt = Math.floor(Date.now() / 1000);
  let deletionError: Error | null = null;
  let lookupError: Error | null = null;
  let deletionGate: Promise<void> | null = null;
  let signalDeletionStarted: (() => void) | null = null;
  const token = mock.method(auth, "verifyIdToken", async () => ({ uid, email, email_verified: verified, admin, auth_time: authenticatedAt }));
  const deleteUser = mock.method(auth, "deleteUser", async () => { signalDeletionStarted?.(); if (deletionGate) await deletionGate; if (deletionError) throw deletionError; });
  const getUser = mock.method(auth, "getUser", async () => { if (lookupError) throw lookupError; return { uid }; });
  const firestore = mock.method(getFirestore(getFirebaseAdminApp()), "runTransaction", async () => { throw new Error("Firestore must not be called in PostgreSQL mode"); });
  try {
    const { POST, DELETE } = await import("../../app/api/accounts/me/route");
    const response = await POST(new Request("http://localhost/api/accounts/me", { method: "POST", headers: { authorization: "Bearer review-test-token", "content-type": "application/json" }, body: JSON.stringify({ name: "API登録テスト", phone: "09000000000", contact: "" }) }));
    assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json()).account.contact, "review@example.test");
    assert.ok(await repo.findAccountByFirebaseUid("review-api-user"));
    const request = (url: string, method: string, body?: unknown) => new Request(`http://localhost${url}`, { method, headers: { authorization: "Bearer review-test-token", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const { POST: createBooking } = await import("../../app/api/reservations/route");
    const booking = { ...input, status: "confirmed_requested", email: "review@example.test", cancellationPolicyAgreement: { accepted: true, version: cancellationPolicyVersion } };
    assert.equal((await createBooking(request("/api/reservations", "POST", booking))).status, 403);
    verified = true;
    const initialBookingRequest = request("/api/reservations", "POST", booking);
    initialBookingRequest.headers.set("Idempotency-Key", "review-api-receipt-retry-key");
    const created = await createBooking(initialBookingRequest);
    assert.equal(created.status, 201, JSON.stringify(await created.clone().json()));
    const createdBody = await created.json();
    assert.equal(createdBody.receiptEmail.status, "failed");
    const reservationId = createdBody.reservation.id;
    assert.equal((await repo.listReservationsForReservationAccount("review-api-user")).length, 1);
    await repo.updateReceiptEmailDelivery(reservationId, { sentAt: null, lastAttemptAt: new Date().toISOString(), retryCount: 5, lastError: "mail retries exhausted" });
    const retryBookingRequest = request("/api/reservations", "POST", booking);
    retryBookingRequest.headers.set("Idempotency-Key", "review-api-receipt-retry-key");
    const receiptRetry = await createBooking(retryBookingRequest);
    assert.equal(receiptRetry.status, 201);
    const retryBody = await receiptRetry.json();
    assert.equal(retryBody.reservation.id, reservationId);
    assert.equal(retryBody.receiptEmail.status, "failed");
    assert.equal((await repo.listReservationsForReservationAccount("review-api-user")).length, 1);
    admin = true;
    const { PATCH: updateStatus } = await import("../../app/api/reservations/[id]/status/route");
    const status = await updateStatus(request(`/api/reservations/${reservationId}/status`, "PATCH", { status: "confirmed" }), { params: Promise.resolve({ id: reservationId }) });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).approvalEmail.status, "failed");
    assert.ok((await repo.listApprovalEmailDeliveries()).some(delivery => delivery.reservationId === reservationId && !delivery.sentAt));
    const { PATCH: assign } = await import("../../app/api/reservations/[id]/store/route");
    const assignment = await assign(request(`/api/reservations/${reservationId}/store`, "PATCH", { assignments: [{ store: "テスト店", people: 5 }] }), { params: Promise.resolve({ id: reservationId }) });
    assert.equal(assignment.status, 200);
    const { PATCH: contact } = await import("../../app/api/reservations/[id]/confirmation-contact/route");
    const contacted = await contact(request(`/api/reservations/${reservationId}/confirmation-contact`, "PATCH", { contactedAt: "2026-11-01T00:00:00Z", sendEmail: false }), { params: Promise.resolve({ id: reservationId }) });
    assert.equal(contacted.status, 200);
    assert.equal((await contacted.json()).reservation.status, "waiting_for_visit");
    const { PATCH: editBooking } = await import("../../app/api/reservations/[id]/route");
    const edited = await editBooking(request(`/api/reservations/${reservationId}`, "PATCH", { people: 7 }), { params: Promise.resolve({ id: reservationId }) });
    assert.equal(edited.status, 200);
    const editedBody = await edited.json();
    assert.equal(editedBody.reservation.status, "confirmed");
    assert.deepEqual(editedBody.reservation.storeAssignments, []);
    const ownAdminBooking = await createBooking(request("/api/reservations", "POST", { ...booking, customerAccountMode: "account" }));
    assert.equal(ownAdminBooking.status, 201);
    const ownAdminBody = await ownAdminBooking.json();
    assert.ok(ownAdminBody.reservation.accountId);
    assert.equal((await repo.listReservationsForReservationAccount("review-api-user")).length, 2);
    const proxyBooking = await createBooking(request("/api/reservations", "POST", { ...booking, customerAccountMode: "admin" }));
    assert.equal(proxyBooking.status, 201);
    assert.equal((await proxyBooking.json()).reservation.accountId, null);
    assert.equal((await repo.listReservationsForReservationAccount("review-api-user")).length, 2);
    // Incomplete bookings must still prevent deletion of normal accounts.
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 409);
    assert.equal(deleteUser.mock.callCount(), 0);

    // A Firebase-only registration needs no fabricated profile before it can be deleted.
    uid = "review-orphan-user";
    admin = false;
    const accountCount = (await repo.listAccounts()).length;
    authenticatedAt = Math.floor(Date.now() / 1000) - 600;
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 403);
    assert.equal(deleteUser.mock.callCount(), 0);
    authenticatedAt = Math.floor(Date.now() / 1000);
    const deletedOrphan = await DELETE(request("/api/accounts/me", "DELETE"));
    assert.equal(deletedOrphan.status, 200);
    assert.deepEqual(await deletedOrphan.json(), { deleted: true });
    assert.equal(deleteUser.mock.calls[0].arguments[0], uid);
    assert.equal((await repo.listAccounts()).length, accountCount);
    assert.equal(await repo.findAccountByFirebaseUid(uid), null);

    deletionError = Object.assign(new Error("Already deleted"), { code: "auth/user-not-found" });
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 200);

    // Real Auth failures propagate, and an existing profile is restored on failure.
    deletionError = Object.assign(new Error("Authentication backend unavailable"), { statusCode: 503 });
    uid = "review-orphan-delete-failure";
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 503);
    assert.equal(await repo.getAccountDeletion(uid), null);
    uid = "review-deletion-rollback";
    await repo.createAccount({ firebaseUid: uid, name: "削除復旧テスト", contact: "rollback@example.test", phone: "09000000000" });
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 503);
    assert.ok(await repo.findAccountByFirebaseUid(uid));
    assert.equal(await repo.getAccountDeletion(uid), null);
    deletionError = null;
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 200);
    assert.equal(await repo.findAccountByFirebaseUid(uid), null);
    assert.ok((await repo.getAccountDeletion(uid))?.completedAt);
    await assert.rejects(repo.reactivateAccount((await repo.listInactiveAccounts()).find(account => account.firebaseUid === uid)!.id!), /削除/);

    // A second request must not remove the first request's guard or resurrect its profile.
    uid = "review-delete-inflight";
    let releaseDeletion!: () => void;
    deletionGate = new Promise<void>(resolve => { releaseDeletion = resolve; });
    const started = new Promise<void>(resolve => { signalDeletionStarted = resolve; });
    const inflight = DELETE(request("/api/accounts/me", "DELETE"));
    await started;
    try {
      assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 409);
      assert.equal((await POST(request("/api/accounts/me", "POST", { name: "復活要求", phone: "09000000000" }))).status, 403);
      assert.equal((await createBooking(request("/api/reservations", "POST", { ...input, status: "confirmed_requested", customerAccountMode: "account" }))).status, 403);
      assert.equal(await repo.findAccountByFirebaseUid(uid), null);
    } finally { releaseDeletion(); deletionGate = null; signalDeletionStarted = null; }
    assert.equal((await inflight).status, 200);
    assert.ok((await repo.getAccountDeletion(uid))?.completedAt);

    // A lost successful Auth response must not restore the application account.
    uid = "review-delete-lost-response";
    await repo.createAccount({ firebaseUid: uid, name: "応答喪失", contact: "lost@example.test" });
    deletionError = Object.assign(new Error("Lost response"), { statusCode: 503 });
    lookupError = Object.assign(new Error("Already deleted"), { code: "auth/user-not-found" });
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 200);
    assert.equal(await repo.findAccountByFirebaseUid(uid), null);
    assert.ok((await repo.getAccountDeletion(uid))?.completedAt);

    uid = "review-delete-unknown-outcome";
    await repo.createAccount({ firebaseUid: uid, name: "状態不明", contact: "unknown@example.test" });
    lookupError = Object.assign(new Error("Lookup unavailable"), { statusCode: 503 });
    assert.equal((await DELETE(request("/api/accounts/me", "DELETE"))).status, 503);
    assert.equal(await repo.findAccountByFirebaseUid(uid), null);
    assert.deepEqual(await repo.getAccountDeletion(uid), { completedAt: null });

    // Both endpoints rewrite a full profile; the shared lock must preserve both changes.
    uid = "review-email-profile-concurrent";
    email = "new-sync@example.test";
    await repo.createAccount({ firebaseUid: uid, name: "旧氏名", contact: "old-sync@example.test", phone: "09000000000" });
    const { PATCH: syncEmail } = await import("../../app/api/accounts/me/email/route");
    const { PATCH: editProfile } = await import("../../app/api/accounts/me/route");
    const [emailResponse, profileResponse] = await Promise.all([
      syncEmail(request("/api/accounts/me/email", "PATCH")),
      editProfile(request("/api/accounts/me", "PATCH", { name: "更新氏名", phone: "08000000000", address: "新住所", accountType: "individual" })),
    ]);
    assert.equal(emailResponse.status, 200);
    const synced = await emailResponse.json();
    assert.equal(synced.changed, true); assert.equal(synced.notification.status, "failed");
    assert.equal(profileResponse.status, 200);
    const profile = await repo.findAccountByFirebaseUid(uid);
    assert.equal(profile?.name, "更新氏名"); assert.equal(profile?.phone, "08000000000"); assert.equal(profile?.contact, email);
    assert.equal(firestore.mock.callCount(), 0);
  } finally {
    token.mock.restore(); deleteUser.mock.restore(); getUser.mock.restore(); firestore.mock.restore();
    for (const [key, value] of Object.entries(savedEnvironment)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});


test("store capacities and full reservation application details survive database round trips", async () => {
  const store = await repo.createStore({ name:"受入上限テスト店", displayOrder:99, capacity:80 });
  assert.equal(store.capacity,80);
  const changed = await repo.updateStore(store.name,{name:store.name,displayOrder:99,capacity:0}); assert.equal(changed.capacity,0);
  const preserved = await repo.updateStore(store.name,{name:store.name,displayOrder:98}); assert.equal(preserved.capacity,0);
  const cleared = await repo.updateStore(store.name,{name:store.name,displayOrder:98,capacity:null}); assert.equal(cleared.capacity,null);
  const r = await repo.createReservation({...input,name:"申請時会社名",accountType:"travel_agency",companyBranchName:"申請時支店",contactPersonName:"申請時担当者",bookingType:"travel_agency_group",bookingContactName:"予約担当者",dayContactName:"当日担当者",dayContactPhone:"08000000000",groupName:"申請団体",groupNameKana:"シンセイダンタイ",groupType:"その他",groupTypeOther:"団体詳細",tcCount:2,dgCount:1,paymentCondition:"other",remarks:"申請時備考",status:"confirmed_requested",policyAgreement:{kind:"confirmed",acceptedAt:"2026-10-16T00:00:00Z"}});
  const restored=(await repo.listReservations()).find(row=>row.id===r.id)!;
  assert.equal(restored.companyBranchName,"申請時支店");assert.equal(restored.contactPersonName,"申請時担当者");assert.equal(restored.accountType,"travel_agency");assert.equal(restored.groupTypeOther,"団体詳細");assert.equal(restored.tcCount,2);assert.equal(restored.remarks,"申請時備考");assert.equal(restored.policyAgreement?.acceptedAt,"2026-10-16T00:00:00.000Z");
});

test("availability API requires admin and returns fresh capacity plus the submitted profile", {skip:process.env.DB_TEST_DRIVER!=="postgres"}, async()=>{
  const saved={APP_ENV:process.env.APP_ENV,DB_PROVIDER:process.env.DB_PROVIDER,DATABASE_URL:process.env.DATABASE_URL};
  process.env.APP_ENV="test";process.env.DB_PROVIDER="drizzle";process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  let admin=false;const auth=getAuth(getFirebaseAdminApp());const token=mock.method(auth,"verifyIdToken",async()=>({uid:"availability-api",admin,email_verified:true}));
  try{
    await repo.saveSystemSettings({acceptanceCapacity:175});
    const {GET}=await import("../../app/api/reservations/[id]/availability/route");
    const reservation=await repo.createReservation({...input,name:"申請保存名",companyBranchName:"元の支店",contactPersonName:"元の担当",accountType:"travel_agency",tcCount:2,status:"confirmed_requested"});
    const context={params:Promise.resolve({id:reservation.id})};
    assert.equal((await GET(new Request("http://localhost/api/reservations/test/availability"),context)).status,401);
    const request=()=>new Request("http://localhost/api/reservations/test/availability",{headers:{authorization:"Bearer test-token"}});
    assert.equal((await GET(request(),context)).status,403);admin=true;
    const response=await GET(request(),context);assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
    const body=await response.json();assert.equal(body.reservation.companyBranchName,"元の支店");assert.equal(body.reservation.contactPersonName,"元の担当");assert.equal(body.availability.capacity,175);assert.equal(body.availability.current,input.people);
    assert.equal((await GET(request(),{params:Promise.resolve({id:"missing"})})).status,404);
  }finally{token.mock.restore();for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

 test("global settings persist independently of stores and settings API validates admin writes", {skip:process.env.DB_TEST_DRIVER!=="postgres"}, async()=>{
  await repo.saveSystemSettings({acceptanceCapacity:250});
  const stores=await repo.listStores();
  if(stores[0]) await repo.updateStore(stores[0].name,{...stores[0],capacity:1});
  assert.equal((await repo.getSystemSettings()).acceptanceCapacity,250);
  let admin=false; const auth=getAuth(getFirebaseAdminApp()); const token=mock.method(auth,"verifyIdToken",async()=>({uid:"settings-api",admin,email_verified:true}));
  try {
    const {GET,PUT}=await import("../../app/api/system-settings/route");
    const req=(value:unknown)=>new Request("http://localhost/api/system-settings",{method:"PUT",headers:{authorization:"Bearer test-token","content-type":"application/json"},body:JSON.stringify(value)});
    assert.equal((await GET(new Request("http://localhost/api/system-settings"))).status,401);
    assert.equal((await PUT(req({acceptanceCapacity:500}))).status,403);
    admin=true;
    for(const value of [-1,1.5,100000,"200"]) assert.equal((await PUT(req({acceptanceCapacity:value}))).status,400);
    for(const value of [0,200,null]) {assert.equal((await PUT(req({acceptanceCapacity:value}))).status,200); assert.equal((await repo.getSystemSettings()).acceptanceCapacity,value);}
  } finally {token.mock.restore();}
});

test("blocked periods persist and prevent approval without changing reservation or queuing mail", {skip:process.env.DB_TEST_DRIVER!=="postgres"}, async()=>{
  const blocked = {start:"2026-11-15T12:00",end:"2026-11-15T15:00",reason:"貸切"};
  await repo.saveSystemSettings({acceptanceCapacity:200,blockedPeriods:[blocked]});
  await repo.saveSystemSettings({acceptanceCapacity:250});
  assert.deepEqual((await repo.getSystemSettings()).blockedPeriods,[blocked]);
  const reservation=await repo.createReservation({...input,status:"confirmed_requested"});
  const auth=getAuth(getFirebaseAdminApp());const token=mock.method(auth,"verifyIdToken",async()=>({uid:"block-admin",admin:true,email_verified:true}));
  try {
    const {GET}=await import("../../app/api/reservations/[id]/availability/route");
    const context={params:Promise.resolve({id:reservation.id})};
    const response=await GET(new Request("http://localhost/api/reservations/test/availability",{headers:{authorization:"Bearer test-token"}}),context);
    assert.deepEqual((await response.json()).availability.blockedPeriods,[blocked]);
    const {PATCH}=await import("../../app/api/reservations/[id]/status/route");
    const before=(await repo.listApprovalEmailDeliveries()).length;
    const result=await PATCH(new Request("http://localhost/api/reservations/test/status",{method:"PATCH",headers:{authorization:"Bearer test-token","content-type":"application/json"},body:JSON.stringify({status:"confirmed"})}),context);
    assert.equal(result.status,400);assert.match((await result.json()).error,/受入不可/);
    assert.equal((await repo.listReservations()).find(r=>r.id===reservation.id)?.status,"confirmed_requested");
    assert.equal((await repo.listApprovalEmailDeliveries()).length,before);
    const rejected=await PATCH(new Request("http://localhost/api/reservations/test/status",{method:"PATCH",headers:{authorization:"Bearer test-token","content-type":"application/json"},body:JSON.stringify({status:"confirmed_rejected"})}),context);
    assert.equal(rejected.status,200);
    await repo.saveSystemSettings({acceptanceCapacity:250,blockedPeriods:[]});
    assert.deepEqual((await repo.getSystemSettings()).blockedPeriods,[]);
  } finally {token.mock.restore();}
});

test("settings reads retain saved periods when a development database client has an older schema", {skip:process.env.DB_TEST_DRIVER!=="postgres"}, async()=>{
  const {pgTable,text,integer}=await import("drizzle-orm/pg-core");
  const oldSettings=pgTable("system_settings",{settingKey:text("setting_key").primaryKey(),acceptanceCapacity:integer("acceptance_capacity")});
  const oldClient=drizzle((db as ReservationDatabase & {$client:Pool}).$client,{schema:{systemSettings:oldSettings}});
  const staleRepo=new DrizzleReservationRepository(oldClient as unknown as ReservationDatabase);
  const periods=[{start:"2026-12-01T10:00",end:"2026-12-01T15:00",reason:"点検"}];
  await repo.saveSystemSettings({acceptanceCapacity:200,blockedPeriods:periods});
  assert.deepEqual((await staleRepo.getSystemSettings()).blockedPeriods,periods);
  assert.deepEqual((await staleRepo.saveSystemSettings({acceptanceCapacity:100})).blockedPeriods,periods);
  await repo.saveSystemSettings({acceptanceCapacity:100,blockedPeriods:[]});
});

test("customer submission deadlines apply to new, original and requested dates while admin entry is allowed", {skip:process.env.DB_TEST_DRIVER!=="postgres"}, async()=>{
  const {earliestReservationDate}=await import("../../lib/reservation-lead-time");
  assert.equal((await repo.getSystemSettings()).reservationLeadDays,3);
  await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:3});
  await repo.saveSystemSettings({acceptanceCapacity:110});
  assert.equal((await repo.getSystemSettings()).reservationLeadDays,3);
  const uid="lead-time-customer";
  await repo.createAccount({firebaseUid:uid,name:"締切テスト",contact:"deadline@example.test",phone:input.phone});
  const near=earliestReservationDate(1), far=earliestReservationDate(10);
  const nearBooking=await repo.createReservation({...input,date:near,status:"temporary_confirmed",customerAccountMode:"account",accountFirebaseUid:uid});
  const farBooking=await repo.createReservation({...input,date:far,status:"confirmed",customerAccountMode:"account",accountFirebaseUid:uid});
  let admin=false;const auth=getAuth(getFirebaseAdminApp());const token=mock.method(auth,"verifyIdToken",async()=>({uid,email:"deadline@example.test",admin,email_verified:true}));
  const request=(path:string,body:unknown)=>new Request(`http://localhost${path}`,{method:"POST",headers:{authorization:"Bearer test-token","content-type":"application/json"},body:JSON.stringify(body)});
  try {
    const {POST:create}=await import("../../app/api/reservations/route");
    const before=(await repo.listReservations()).length;
    assert.equal((await create(request("/api/reservations",{...input,date:near,status:"confirmed_requested"}))).status,400);
    assert.equal((await repo.listReservations()).length,before);
    const {POST:change}=await import("../../app/api/reservations/change-requests/route");
    const changeBody={reservationId:nearBooking.id,requestedDate:far,requestedStartTime:"13:00",requestedPeople:5,requestedMenuItems:input.menuItems};
    assert.equal((await change(request("/api/reservations/change-requests",changeBody))).status,400);
    assert.equal((await change(request("/api/reservations/change-requests",{...changeBody,reservationId:farBooking.id,requestedDate:near}))).status,400);
    assert.equal((await change(request("/api/reservations/change-requests",{...changeBody,reservationId:farBooking.id}))).status,201);
    const {POST:confirmed}=await import("../../app/api/reservations/confirmed-request/route");
    assert.equal((await confirmed(request("/api/reservations/confirmed-request",{reservationId:nearBooking.id}))).status,400);
    admin=true;
    assert.equal((await create(request("/api/reservations",{...input,date:near,status:"confirmed"}))).status,201);
    const {GET}=await import("../../app/api/reservation-policy/route");
    await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:1});
    const policy=await (await GET()).json();assert.equal(policy.days,1);assert.equal(policy.minimumDate,earliestReservationDate(1));
    await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:3});
  } finally {token.mock.restore();}
});

test("lead days default to three and persist across updates to other settings",async()=>{
  await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:3});
  assert.equal((await repo.getSystemSettings()).reservationLeadDays,3);
  await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:2});
  await repo.saveSystemSettings({acceptanceCapacity:120,blockedPeriods:[]});
  assert.equal((await repo.getSystemSettings()).reservationLeadDays,2);
  await repo.saveSystemSettings({acceptanceCapacity:100,reservationLeadDays:3});
});
