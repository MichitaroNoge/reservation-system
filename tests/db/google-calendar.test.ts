import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { eq } from "drizzle-orm";
import { createCalendarFixture } from "./calendar-fixture";
import { getDatabase } from "../../lib/db/client";
import * as s from "../../lib/db/schema";
import { runCalendarSync } from "../../lib/google-calendar/sync";
import { changeCalendarSettings, calendarSettings, createOrRecoverCalendar } from "../../lib/google-calendar/settings";
import { CalendarError, encrypt, decrypt } from "../../lib/google-calendar/security";
import { calendarAdmin } from "../../lib/google-calendar/http";
import { beginCalendarOAuth, completeCalendarOAuth } from "../../lib/google-calendar/oauth";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../../lib/auth";
import { calendarScope } from "../../lib/google-calendar/security";
import { googleCalendarClient, type CalendarClient } from "../../lib/google-calendar/client";
import type { CalendarEvent } from "../../lib/google-calendar/policy";
const base = { name: "カレンダー検証", phone: "09012345678", email: "private@example.test", address: "秘密の住所", date: "2099-11-15", startTime: "12:00", people: 30, menuItems: ["検証メニュー"] };
function config() { process.env.GOOGLE_CALENDAR_CLIENT_ID = "test.apps.googleusercontent.com"; process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "test-client-secret"; process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32,7).toString("base64"); process.env.GOOGLE_CALENDAR_REDIRECT_URI = "https://calendar.example.test/api/admin/google-calendar/callback"; }
const req = (token = "", body?: object, origin = "https://calendar.example.test") => new Request("https://calendar.example.test/api/admin/google-calendar", { method: body ? "POST" : "GET", headers: { origin, ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function connect() { const db = await getDatabase(); await db.insert(s.googleCalendarConnection).values({ key: "default", googleSub: "google-test-sub", email: "admin@example.test", refreshToken: encrypt("secret-refresh-token"), calendarId: "test-calendar", connectedBy: "calendar-test-user", enabled: true }); }
function fake() { const events = new Map<string, CalendarEvent>(); const removed: string[] = []; const client: CalendarClient = { createCalendar: async () => "test-calendar", verifyCalendar: async () => {}, put: async (_, id, event) => { events.set(id, event); }, remove: async (_, id) => { events.delete(id); removed.push(id); } }; return { events, removed, client, factory: async () => client }; }
async function drain(factory: () => Promise<CalendarClient>) { for (let i=0;i<4;i++) { const result = await runCalendarSync(await getDatabase(), factory, 10); if (!result.processed) break; } }

test("transactional Google calendar outbox follows approvals, pending changes, allocations and cancellations", async () => {
 const fixture = await createCalendarFixture(); config(); const remote = fake();
 try {
  await connect();
  for (const status of ["temporary_requested", "confirmed_requested", "temporary_rejected", "confirmed_rejected", "cancelled", "cancellation_requested"] as const) await fixture.repo.createReservation({ ...base, status });
  await drain(remote.factory); assert.equal(remote.events.size,0);
  const r=await fixture.repo.createReservation({ ...base, status:"temporary_requested" });
  await fixture.repo.updateReservationStatus(r.id,"temporary_confirmed"); await drain(remote.factory); assert.equal(remote.events.size,1);
  const [eventId,event] = [...remote.events][0]; assert.match(event.summary,/仮予約/); assert.doesNotMatch(JSON.stringify(event),/秘密|private@example/);
  await fixture.repo.updateReservationStatus(r.id,"confirmed_requested"); await drain(remote.factory); assert.match(remote.events.get(eventId)!.summary,/仮予約/);
  await fixture.repo.updateReservationStatus(r.id,"temporary_confirmed"); await drain(remote.factory); assert.equal(remote.events.size,1);
  await fixture.repo.updateReservationStatus(r.id,"confirmed_requested"); await fixture.repo.updateReservationStatus(r.id,"confirmed"); await drain(remote.factory); assert.match(remote.events.get(eventId)!.summary,/本予約/);
  await fixture.repo.assignStores(r.id,[{store:"検証店舗",people:30}]); await drain(remote.factory); assert.match(remote.events.get(eventId)!.description,/検証店舗 30名/);
  await fixture.repo.updateReservation(r.id,{people:25,date:"2099-11-16"}); await drain(remote.factory); assert.match(remote.events.get(eventId)!.summary,/25名/); assert.match(remote.events.get(eventId)!.start.dateTime,/2099-11-16/);
  await fixture.repo.updateReservationStatus(r.id,"cancellation_requested"); await drain(remote.factory); assert.match(remote.events.get(eventId)!.summary,/キャンセル申請中/);
  await fixture.repo.updateReservationStatus(r.id,"cancelled"); await drain(remote.factory); assert.equal(remote.events.size,0); assert.ok(remote.removed.includes(eventId));
  await fixture.repo.updateReservationStatus(r.id,"confirmed"); await drain(remote.factory); assert.equal(remote.events.size,1); assert.notEqual([...remote.events.keys()][0],eventId);
 } finally { await fixture.close(); }
});
test("Google sync survives offline operation, lost responses and retries without duplicate events", async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase(), remote=fake();
 try{
  const r=await fixture.repo.createReservation({...base,status:"confirmed"});
  assert.deepEqual(await runCalendarSync(db,remote.factory),{processed:0,failed:0}); await connect();
  let fail=true;const normal=remote.client.put;remote.client.put=async(...args)=>{await normal(...args);if(fail){fail=false;throw new CalendarError("provider_error");}};
  assert.equal((await runCalendarSync(db,remote.factory)).failed,1);assert.equal(remote.events.size,1);
  const pending=await db.select().from(s.googleCalendarSync);assert.equal(pending[0].status,"error");
  await changeCalendarSettings(db,"retry");await runCalendarSync(db,remote.factory);assert.equal(remote.events.size,1);assert.equal((await db.select().from(s.googleCalendarSync))[0].status,"synced");
  await changeCalendarSettings(db,"pause");await fixture.repo.updateReservation(r.id,{people:28});await runCalendarSync(db,remote.factory);assert.match([...remote.events.values()][0].summary,/30名/);
  await changeCalendarSettings(db,"resume");await runCalendarSync(db,remote.factory);assert.match([...remote.events.values()][0].summary,/28名/);
  await changeCalendarSettings(db,"disconnect");assert.equal((await db.select().from(s.googleCalendarConnection))[0].refreshToken,"");assert.equal(remote.events.size,1);
 }finally{await fixture.close();}
});
test("Google sync never exports rolled back approvals or new historical reservations",async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase(),remote=fake();
 try{await connect();const r=await fixture.repo.createReservation({...base,status:"confirmed_requested"});
  await assert.rejects(fixture.repo.withTransaction("calendar-rollback",async repo=>{await repo.updateReservationStatus(r.id,"confirmed");throw new Error("rollback");}),/rollback/);
  await fixture.repo.createReservation({...base,date:"2000-01-01",status:"visited"});await drain(remote.factory);assert.equal(remote.events.size,0);
  assert.equal((await db.select().from(s.googleCalendarSync).innerJoin(s.reservation,eq(s.reservation.id,s.googleCalendarSync.reservationId)).where(eq(s.reservation.reservationCode,r.id)))[0].google_calendar_sync.approvedKind,null);
 }finally{await fixture.close();}
});
test("Google calendar APIs require administrator, reject forged requests and never expose credentials",async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase();
 try{await connect();assert.equal((await calendarAdmin(req())).status,401);assert.equal((await calendarAdmin(req("calendar-test-member"))).status,403);
  const response=await calendarAdmin(req("calendar-test-admin"));assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.doesNotMatch(JSON.stringify(await response.json()),/secret-refresh-token|refreshToken|client-secret|connectedBy|googleSub/);
  assert.equal((await calendarAdmin(req("calendar-test-admin",{action:"pause"},"https://evil.example"))).status,403);assert.equal((await calendarAdmin(req("calendar-test-admin",{action:"anything"}))).status,400);
  const value=encrypt("not-plaintext");assert.equal(decrypt(value),"not-plaintext");assert.ok(!value.includes("not-plaintext"));assert.throws(()=>decrypt(value.slice(0,-2)+"xx"));
  await changeCalendarSettings(db,"pause");assert.equal((await calendarSettings(db)).connection?.enabled,false);
 }finally{await fixture.close();}
});
test("a concurrent reservation change remains queued after an older Google response", {skip:process.env.DB_TEST_DRIVER!=="postgres"},async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase(),remote=fake();
 try{await connect();const r=await fixture.repo.createReservation({...base,status:"confirmed"});let changed=false;const normal=remote.client.put;remote.client.put=async(...args)=>{await normal(...args);if(!changed){changed=true;await fixture.repo.updateReservation(r.id,{people:29});}};
  await runCalendarSync(db,remote.factory,1);assert.equal((await db.select().from(s.googleCalendarSync))[0].status,"pending");await runCalendarSync(db,remote.factory);assert.match([...remote.events.values()][0].summary,/29名/);assert.equal(remote.events.size,1);
 }finally{await fixture.close();}
});

test("administrator OAuth grants are browser-bound, single use, PKCE protected and checked against current admin permission",async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase();
 const user=mock.method(getAuth(getFirebaseAdminApp()),"getUser",async()=>({uid:"calendar-test-user",disabled:false,email:"admin@example.test",emailVerified:true,customClaims:{admin:true}}));
 let state="", exchanges=0;
 const exchange=mock.method(OAuth2Client.prototype,"getToken",async()=>{exchanges++;return {tokens:{refresh_token:"new-refresh-token",id_token:"id-token",scope:`openid email ${calendarScope}`}};});
 const verify=mock.method(OAuth2Client.prototype,"verifyIdToken",async()=>new LoginTicket("test",{sub:"google-test-sub",email:"admin@example.test",email_verified:true,iss:"https://accounts.google.com",aud:"test.apps.googleusercontent.com",iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...{nonce:state}}));
 try{
  const start=await beginCalendarOAuth(db,req("calendar-test-admin",{}),"calendar-test-user");const auth=new URL((await start.json()).url);state=auth.searchParams.get("state")!;
  assert.equal(auth.searchParams.get("code_challenge_method"),"S256");assert.ok(auth.searchParams.get("code_challenge"));assert.equal(auth.searchParams.get("access_type"),"offline");assert.ok(!auth.searchParams.get("scope")!.includes("auth/calendar.events"));
  const cookie=start.headers.get("set-cookie")!.split(";")[0], callback=`https://calendar.example.test/api/admin/google-calendar/callback?state=${state}&code=test-code`;
  await assert.rejects(completeCalendarOAuth(db,new Request(callback)),/invalid_flow/);assert.equal(exchanges,0);
  await completeCalendarOAuth(db,new Request(callback,{headers:{cookie}}));assert.equal(exchanges,1);
  const row=(await db.select().from(s.googleCalendarConnection))[0];assert.equal(decrypt(row.refreshToken),"new-refresh-token");assert.equal(row.enabled,false);assert.equal(row.calendarId,null);
  await assert.rejects(completeCalendarOAuth(db,new Request(callback,{headers:{cookie}})),/invalid_flow/);assert.equal(exchanges,1);
  const second=await beginCalendarOAuth(db,req("calendar-test-admin",{}),"calendar-test-user");const next=new URL((await second.json()).url);const otherCookie=second.headers.get("set-cookie")!.split(";")[0];
  user.mock.mockImplementation(async()=>({uid:"calendar-test-user",disabled:true,email:"admin@example.test",emailVerified:true,customClaims:{admin:true}}));
  await assert.rejects(completeCalendarOAuth(db,new Request(`https://calendar.example.test/api/admin/google-calendar/callback?state=${next.searchParams.get("state")}&code=test-code`,{headers:{cookie:otherCookie}})),/invalid_flow/);assert.equal(exchanges,1);
 }finally{user.mock.restore();exchange.mock.restore();verify.mock.restore();await fixture.close();}
});

test("calendar creation with an unknown result is not repeated and can recover an existing calendar",async()=>{
 const fixture=await createCalendarFixture();config();const db=await getDatabase();let creations=0;
 const client:CalendarClient={createCalendar:async()=>{creations++;throw new CalendarError("provider_error");},verifyCalendar:async(id)=>{assert.equal(id,"created-before-timeout");},put:async()=>{},remove:async()=>{}};
 try{await db.insert(s.googleCalendarConnection).values({key:"default",googleSub:"test-sub",email:"admin@example.test",refreshToken:encrypt("refresh"),connectedBy:"calendar-test-user",enabled:false});
  await assert.rejects(createOrRecoverCalendar(db,undefined,async()=>client),/provider_error/);assert.equal(creations,1);
  await assert.rejects(createOrRecoverCalendar(db,undefined,async()=>client),/calendar_creation_unknown/);assert.equal(creations,1);
  await createOrRecoverCalendar(db,"created-before-timeout",async()=>client);const row=(await db.select().from(s.googleCalendarConnection))[0];assert.equal(row.calendarId,"created-before-timeout");assert.equal(row.enabled,true);
 }finally{await fixture.close();}
});
test("Google HTTP adapter uses stable event IDs, handles insertion conflicts, tombstones and quota errors safely",async()=>{
 config();const access=mock.method(OAuth2Client.prototype,"getAccessToken",async()=>({token:"test-access-token"}));
 let responses:Response[]=[], calls:{url:string;method:string;body?:string}[]=[];
 const network=mock.method(globalThis,"fetch",async(url:string|URL|Request,options?:RequestInit)=>{calls.push({url:String(url),method:options?.method??"GET",body:options?.body as string|undefined});const response=responses.shift();if(!response)throw new Error("Unexpected network request");return response;});
 const reply=(status:number,body:unknown={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
 const event:CalendarEvent={summary:"本予約",description:"業務情報",colorId:"9",visibility:"default",start:{dateTime:"2099-11-15T12:00:00+09:00",timeZone:"Asia/Tokyo"},end:{dateTime:"2099-11-15T13:00:00+09:00",timeZone:"Asia/Tokyo"},extendedProperties:{private:{reservationSystem:"v1",reservationNumber:"RSV-1001"}}};
 try{const client=await googleCalendarClient("test-refresh");responses=[reply(404),reply(409),reply(200,{status:"confirmed"}),reply(200)];await client.put("calendar@example.test","aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",event);
  assert.equal(calls.length,4);assert.match(calls[0].url,/aaaaaaaabbbbccccddddeeeeeeeeeeee/);assert.match(calls[1].body!,/"id":"aaaaaaaabbbbccccddddeeeeeeeeeeee"/);assert.equal(calls[3].method,"PUT");assert.ok(calls.every(c=>!c.url.includes("test-access-token")));
  calls=[];responses=[reply(404),reply(409),reply(200,{status:"cancelled"})];await assert.rejects(client.put("calendar@example.test","aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",event),/event_deleted/);
  responses=[reply(403,{error:{errors:[{reason:"rateLimitExceeded"}]}})];await assert.rejects(client.put("calendar@example.test","aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",event),/rate_limited/);
  responses=[reply(410)];await client.remove("calendar@example.test","aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
 }finally{network.mock.restore();access.mock.restore();}
});


test("unknown initial Google insert is deleted on cancellation, including failed deletion retries", async () => {
 const fixture=await createCalendarFixture();config();const db=await getDatabase(),remote=fake();
 try {
  await connect();const r=await fixture.repo.createReservation({...base,status:"confirmed"});
  const put=remote.client.put;remote.client.put=async(...args)=>{await put(...args);throw new CalendarError("provider_error");};
  assert.equal((await runCalendarSync(db,remote.factory)).failed,1);
  assert.equal(remote.events.size,1);assert.equal((await db.select().from(s.googleCalendarSync))[0].remotePresent,false);
  await fixture.repo.updateReservationStatus(r.id,"cancellation_requested");await fixture.repo.updateReservationStatus(r.id,"cancelled");
  const remove=remote.client.remove;let lostDelete=true;
  remote.client.remove=async(...args)=>{await remove(...args);if(lostDelete){lostDelete=false;throw new CalendarError("provider_error");}};
  assert.equal((await runCalendarSync(db,remote.factory)).failed,1);
  assert.equal((await db.select().from(s.googleCalendarSync))[0].status,"error");
  await changeCalendarSettings(db,"retry");assert.equal((await runCalendarSync(db,remote.factory)).failed,0);
  assert.equal(remote.events.size,0);assert.equal((await db.select().from(s.googleCalendarSync))[0].status,"excluded");
 } finally {await fixture.close();}
});

test("cancellation cleans a restored event even when the restoration DB commit is lost", async () => {
 const fixture=await createCalendarFixture();config();const db=await getDatabase(),remote=fake();
 try {
  await connect();const r=await fixture.repo.createReservation({...base,status:"confirmed"});
  const [original]=await db.select().from(s.googleCalendarSync);
  const put=remote.client.put;remote.client.put=async(...args)=>{if(args[1]===original.eventId)throw new CalendarError("event_deleted");await put(...args);};
  const transaction=db.transaction.bind(db);
  const rollback=mock.method(db,"transaction",async (work: Parameters<typeof db.transaction>[0])=>transaction(async tx=>{await work(tx);throw new Error("forced_commit_failure");}));
  try {await assert.rejects(runCalendarSync(db,remote.factory),/forced_commit_failure/);}finally{rollback.mock.restore();}
  assert.equal(remote.events.size,1);assert.equal((await db.select().from(s.googleCalendarSync))[0].eventId,original.eventId);
  await fixture.repo.updateReservationStatus(r.id,"cancellation_requested");await fixture.repo.updateReservationStatus(r.id,"cancelled");
  await runCalendarSync(db,remote.factory);assert.equal(remote.events.size,0);
  assert.equal((await db.select().from(s.googleCalendarSync))[0].status,"excluded");
 } finally {await fixture.close();}
});
