import {dispatchQueuedMail} from "../../lib/mail-dispatch";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mock,test} from "node:test";
import {eq,sql} from "drizzle-orm";
import {readFile} from "node:fs/promises";
import {getDatabase} from "../../lib/db/client";
import * as schema from "../../lib/db/schema";
import {InquiryRepository} from "../../lib/inquiries/repository";
import {issueChallenge,verifyChallenge,readBody,submissionLimits} from "../../lib/inquiries/http";
import {deliverInquiryMail,type MailDependencies} from "../../lib/inquiries/mail-service";
import {ResendEmailClient,EmailDeliveryError} from "../../lib/email/resend-email-client";
import {createCalendarFixture} from "./calendar-fixture";
import * as controller from "../../lib/inquiries/controllers";
const sender={from:"検証 <sender@example.test>",replyTo:"",testRecipient:""};
const form=(extra={})=>({name:"問い合わせ本人",email:`${randomUUID()}@example.test`,category:"other" as const,subject:"問い合わせ件名",body:'本文 <script>alert(1)</script>\nhttps://example.test',requestKey:randomUUID(),...extra});
const req=(url:string,body?:object,token="",headers:Record<string,string>={})=>new Request(`http://localhost${url}`,{method:body?"POST":"GET",headers:{origin:"http://localhost",...(body?{"content-type":"application/json"}:{}),...(token?{authorization:`Bearer ${token}`} : {}),...headers},...(body?{body:JSON.stringify(body)}:{})});
async function payload(response:Response,status:number){assert.equal(response.status,status,JSON.stringify(await response.clone().json()));return response.json();}

test("inquiry public/customer/admin APIs enforce ownership, filters, outbox and retry semantics",async()=>{
 const fixture=await createCalendarFixture();const db=await getDatabase(),repo=new InquiryRepository(db);process.env.INQUIRY_FORM_SECRET="test-only-inquiry-form-secret-32-chars";
 const send=mock.method(ResendEmailClient.prototype,"send",async()=>({id:"fake-delivery"}));
 process.env.RESEND_API_KEY="re_fake";process.env.RESEND_FROM_EMAIL=sender.from;process.env.RESEND_ALLOWED_FROM_EMAILS="sender@example.test";
 try{
  await fixture.repo.createAccount({firebaseUid:"calendar-test-user",name:"本人",contact:"owner@example.test",phone:"09012345678"});
  await fixture.repo.createAccount({firebaseUid:"foreign",name:"他人",contact:"foreign@example.test",phone:"09012345678"});
  const booking={name:"本人",email:"owner@example.test",phone:"09012345678",date:"2099-11-15",startTime:"12:00",people:10,menuItems:["検証メニュー"],status:"temporary_confirmed" as const};
  const own=await fixture.repo.createReservation({...booking,accountFirebaseUid:"calendar-test-user"});
  const foreign=await fixture.repo.createReservation({...booking,accountFirebaseUid:"foreign"});
  await payload(await controller.reservationContext(req("/api",undefined,"calendar-test-member"),foreign.id),403);
  await payload(await controller.reservationContext(req("/api"),own.id),401);
  assert.equal((await payload(await controller.reservationContext(req("/api",undefined,"calendar-test-member"),own.id),200)).reservationNumber,own.id);
  // Anonymous challenge bound to browser, request key and minimum input time.
  const issued=issueChallenge(req("/api/inquiries/challenge"),Date.now()-3000),challenge=await issued.json(),cookie=issued.headers.get("set-cookie")!.split(";")[0];
  const anon=form({...challenge});
  const accepted=await payload(await controller.submit(req("/api/inquiries",anon,"",{cookie})),201);
  assert.equal(accepted.receiptEmailSent,false);assert.equal(accepted.receiptEmailQueued,true);assert.equal(send.mock.callCount(),0);await dispatchQueuedMail(fixture.repo);assert.equal(send.mock.callCount(),1);
  assert.equal((await payload(await controller.submit(req("/api/inquiries",anon,"",{cookie})),201)).number,accepted.number);assert.equal(send.mock.callCount(),1);
  await payload(await controller.submit(req("/api/inquiries",{...anon,body:"別内容"},"",{cookie})),409);
  await payload(await controller.submit(req("/api/inquiries",{...anon,requestKey:randomUUID()},"",{cookie})),403);
  await payload(await controller.submit(req("/api/inquiries",form(),"invalid")),401);
  await payload(await controller.submit(req("/api/inquiries",form(),"",{authorization:"garbage"})),401);
  await payload(await controller.submit(req("/api/inquiries",form(),"calendar-test-member",{origin:"https://attacker.example"})),403);
  await payload(await controller.submit(req("/api/inquiries",form({userId:"foreign"}),"calendar-test-member")),400);
  await payload(await controller.submit(req("/api/inquiries",form(),""),own.id),403); // no valid anonymous form proof
  await payload(await controller.submit(req("/api",form({category:"reservation"}),"calendar-test-member")),400);
  await payload(await controller.submit(req("/api",form({category:"service"}),"calendar-test-member")),400);
  for(const patch of [{},{mealDate:"2099-11-15"},{mealDate:"2099-11-15",mealStartTime:"12:00",people:0}])await payload(await controller.submit(req("/api",form({category:"availability",...patch}),"calendar-test-member")),400);
  const memberForm=form({category:"availability",mealDate:"2099-11-15",mealStartTime:"12:00",people:24,body:"アレルギー対応は可能ですか。"});const member=await payload(await controller.submit(req("/api",memberForm,"calendar-test-member")),201);
  const related=await payload(await controller.submit(req("/api",form(),"calendar-test-member"),own.id),201);
  await payload(await controller.submit(req("/api",form(),"calendar-test-member"),foreign.id),403);
  const history=await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member")),200);
  assert.equal(history.total,2);assert.ok(history.inquiries.every((i:{number:string})=>i.number!==accepted.number));
  assert.equal((await repo.detail(member.number)).inquiry.category,"availability");
  assert.deepEqual((await repo.detail(member.number)).inquiry.availability,{mealDate:"2099-11-15",mealStartTime:"12:00",people:24});
  const receipt=(await db.select().from(schema.emailDelivery)).find(row=>row.templateKey==="inquiry_receipt"&&row.body.includes("食事日: 2099/11/15"));assert.ok(receipt);for(const value of ["食事開始時間: 12:00","人数: 24名","アレルギー対応は可能ですか。"])assert.ok(receipt.body.includes(value));
  await payload(await controller.submit(req("/api",{...memberForm,people:25},"calendar-test-member")),409);
  const available=await payload(await controller.adminInquiries(req("/api?category=availability",undefined,"calendar-test-admin")),200);assert.equal(available.total,1);assert.equal(available.inquiries[0].availability.people,24);
  const mine=await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),related.number),200);assert.equal(mine.inquiry.reservationNumber,own.id);assert.equal(mine.inquiry.category,"reservation");
  await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),accepted.number),404);
  await payload(await controller.adminInquiries(req("/api")),401);await payload(await controller.adminInquiries(req("/api",undefined,"calendar-test-member")),403);
  await payload(await controller.adminInquiries(req("/api?pageSize=101",undefined,"calendar-test-admin")),400);
  await payload(await controller.adminInquiries(req("/api?page=1&page=2",undefined,"calendar-test-admin")),400);
  await payload(await controller.adminInquiries(req("/api",undefined,"calendar-test-admin"),"INQ-9999999999"),404);
  const list=await payload(await controller.adminInquiries(req("/api?pageSize=1&keyword=INQ-",undefined,"calendar-test-admin")),200);assert.equal(list.total,3);assert.equal(list.inquiries.length,1);
  assert.doesNotMatch(JSON.stringify(list),/requestKey|requestHash|firebaseUid|leaseToken|receiptSender/);
  await dispatchQueuedMail(fixture.repo);
  const detail=await repo.detail(member.number);const replyInput={subject:"回答",body:"回答内容",requestKey:randomUUID(),revision:detail.inquiry.revision};
  await payload(await controller.reply(req("/api",{...replyInput,to:"foreign@example.test"},"calendar-test-admin"),member.number),400);
  // Receipt already consumed cooldown for this address. Clear only the isolated test limit rows.
  await db.delete(schema.abuseLimit);
  await payload(await controller.reply(req("/api",replyInput,"calendar-test-admin"),member.number),200);
  const answer=(await db.select().from(schema.emailDelivery)).find(row=>row.templateKey==="inquiry_reply");assert.ok(answer);for(const value of ["食事日: 2099/11/15","食事開始時間: 12:00","人数: 24名","アレルギー対応は可能ですか。","回答内容"])assert.ok(answer.body.includes(value));
  await dispatchQueuedMail(fixture.repo);
  assert.equal((await repo.detail(member.number)).inquiry.status,"answered");
  const before=send.mock.callCount();await payload(await controller.reply(req("/api",replyInput,"calendar-test-admin"),member.number),200);assert.equal(send.mock.callCount(),before);
  const replies=await db.select().from(schema.inquiryReply);assert.equal(replies.length,1);assert.equal(replies[0].adminFirebaseUid,"calendar-test-user");assert.equal(replies[0].resendMessageId,"fake-delivery");
  const ownReply=await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),member.number),200);assert.equal(ownReply.replies.length,1);assert.equal(ownReply.replies[0].adminLabel,undefined);
  for (const status of ["unhandled", "answered", "in_progress", "closed"]) {
    const denied = await controller.adminInquiries(req("/api", { status, revision: (await repo.detail(member.number)).inquiry.revision }, "calendar-test-admin"), member.number);
    assert.equal(denied.status, 405); assert.equal(denied.headers.get("Allow"), "GET");
  }
  assert.equal((await repo.detail(member.number)).inquiry.status, "answered");
  // Storage first even when mail fails; retries reuse inquiry number and do not create another inquiry.
  process.env.RESEND_API_KEY="";const failedForm=form();const receiptFailure=await payload(await controller.submit(req("/api",failedForm,"calendar-test-member")),201);assert.equal(receiptFailure.receiptEmailSent,false);
  assert.equal((await payload(await controller.submit(req("/api",failedForm,"calendar-test-member")),201)).number,receiptFailure.number);
  const outbox=await db.select().from(schema.emailDelivery);assert.equal(outbox.length,5); // 4 receipts + 1 reply
  const filtered=await payload(await controller.adminInquiries(req("/api?status=answered&category=other",undefined,"calendar-test-admin")),200);assert.equal(filtered.total,0); // the answered inquiry is availability, not other
  const foreignNumber=await repo.create(form(),"user:foreign","foreign",null,[]);
  await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),foreignNumber),404);
  const firstAnon=await repo.row(accepted.number);await db.delete(schema.abuseLimit);
  await payload(await controller.submit(req("/api",form({...challenge,email:firstAnon.row.email,requestKey:challenge.requestKey,body:"別内容"}),"",{cookie})),409);
 }finally{send.mock.restore();await fixture.close();}
});

test("inquiry email failures, timeout, DB finalization failure, leases and idempotency expiry are recoverable",async()=>{
 const fixture=await createCalendarFixture();const db=await getDatabase(),repo=new InquiryRepository(db);
 const deliveryKeys:string[]=[],deps:MailDependencies={sender:async()=>sender,client:async()=>({send:async input=>{deliveryKeys.push(input.idempotencyKey);return{id:"fake-stable"};}})};
 try{
  const number=await repo.create(form(),"user:owner","owner",null,[]),detail=await repo.detail(number),key=randomUUID();
  const id=await repo.prepareReply(number,{subject:"回答",body:"本文",requestKey:key,revision:detail.inquiry.revision},"admin","管理者");
  await assert.rejects(repo.prepareReply(number,{subject:"回答",body:"本文",requestKey:randomUUID(),revision:detail.inquiry.revision},"other-admin",null),/更新/);
  assert.equal((await repo.detail(number)).inquiry.status, "answered");
  const failed:MailDependencies={...deps,client:async()=>({send:async()=>{throw new EmailDeliveryError("provider detail should stay private","failed");}})};
  await assert.rejects(deliverInquiryMail(repo,{number,replyId:id},failed),/送信できません/);
  assert.equal((await repo.detail(number)).inquiry.status,"answered");assert.equal((await repo.detail(number,"owner")).replies.length,1);
  assert.equal((await repo.detail(number)).replies[0].emailStatus,"failed");
  // Simulate provider success followed by a local transaction failure.
  const finish=mock.method(repo,"finishMail",async()=>{throw new Error("database error containing private values");});
  await assert.rejects(deliverInquiryMail(repo,{number,replyId:id},deps),/保存/);finish.mock.restore();
  assert.equal((await repo.detail(number)).replies[0].emailStatus,"sending");
  await assert.rejects(deliverInquiryMail(repo,{number,replyId:id},deps),/送信中/);
  await db.update(schema.inquiryReply).set({leaseUntil:new Date(Date.now()-1).toISOString()}).where(eq(schema.inquiryReply.id,id));
  await deliverInquiryMail(repo,{number,replyId:id},deps);
  assert.equal(deliveryKeys.length,2);assert.equal(deliveryKeys[0],deliveryKeys[1]);assert.equal((await repo.detail(number)).inquiry.status,"answered");
  const sent=await repo.detail(number);assert.equal(sent.replies[0].sentAt!==null,true);
  const id2=await repo.prepareReply(number,{subject:"追記",body:"本文",requestKey:randomUUID(),revision:sent.inquiry.revision},"admin",null);
  await assert.rejects(deliverInquiryMail(repo,{number,replyId:id2},{...deps,timeoutMs:5,client:async()=>({send:()=>new Promise(()=>{})})}),/不明/);
  assert.equal((await repo.detail(number)).replies[1].emailStatus,"unknown");
  await db.update(schema.inquiryReply).set({firstAttemptAt:new Date(Date.now()-24*3600000).toISOString()}).where(eq(schema.inquiryReply.id,id2));
  await assert.rejects(deliverInquiryMail(repo,{number,replyId:id2},deps),/期限/);
  const rows=await db.select().from(schema.emailDelivery);assert.equal(rows.find(r=>r.deliveryKey===deliveryKeys[0])?.status,"sent");
  const freshNumber=await repo.create(form(),"owner","owner",null,[]);
  const competing=await Promise.allSettled([1,2].map(n=>repo.prepareReply(freshNumber,{subject:`回答${n}`,body:"本文",requestKey:randomUUID(),revision:1},`admin-${n}`,null)));
  assert.equal(competing.filter(r=>r.status==="fulfilled").length,1);assert.equal(competing.filter(r=>r.status==="rejected").length,1);
  const prepared=(await repo.detail(freshNumber)).replies[0];
  const claims=await Promise.allSettled([1,2].map(()=>repo.claimMail({number:freshNumber,replyId:prepared.id},sender)));
  assert.equal(claims.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(claims.filter(r=>r.status==="rejected").length,1);
 }finally{await fixture.close();}
});

test("anonymous form binding, body bounds and durable request limits reject abuse",async()=>{
 const fixture=await createCalendarFixture();process.env.INQUIRY_FORM_SECRET="test-only-inquiry-form-secret-32-chars";const repo=new InquiryRepository(await getDatabase());
 try{
  const now=Date.now(),challenge=issueChallenge(req("/api"),now-3000),body=await challenge.json(),cookie=challenge.headers.get("set-cookie")!.split(";")[0];
  assert.match(verifyChallenge(req("/api",undefined,"",{cookie}),body.formToken,body.requestKey,now),/^anonymous:/);
  assert.throws(()=>verifyChallenge(req("/api"),body.formToken,body.requestKey,now));assert.throws(()=>verifyChallenge(req("/api",undefined,"",{cookie}),body.formToken,body.requestKey,now+1900000));
  assert.throws(()=>verifyChallenge(req("/api",undefined,"",{cookie}),body.formToken+"x",body.requestKey,now));
  const fresh=issueChallenge(req("/api"),now),freshBody=await fresh.json();assert.throws(()=>verifyChallenge(req("/api",undefined,"",{cookie:fresh.headers.get("set-cookie")!.split(";")[0]}),freshBody.formToken,freshBody.requestKey,now));
  await assert.rejects(readBody(req("/api",{body:"a".repeat(40000)})),/大きすぎ/);
  const same=form(),limits=submissionLimits(req("/api",undefined,"",{"x-forwarded-for":"1.2.3.4"}),same.email,null);
  assert.ok(limits.some(l=>l.key.endsWith(":unknown")));
  const number=await repo.create(same,"anonymous:test",null,null,limits);
  assert.equal(await repo.create(same,"anonymous:test",null,null,limits),number);
  await assert.rejects(repo.create({...same,requestKey:randomUUID()},"anonymous:test",null,null,limits),{statusCode:429});
  const before=(await repo.list({page:1,pageSize:20,keyword:""})).total;assert.equal(before,1);
  for(let i=0;i<4;i++){const input=form();await repo.create(input,"anonymous:test",null,null,submissionLimits(req("/api",undefined,"",{"x-forwarded-for":`${i}.2.3.4`}),input.email,null));}
  const firstPage=await repo.list({page:1,pageSize:2,keyword:""}),secondPage=await repo.list({page:2,pageSize:2,keyword:""});assert.equal(firstPage.total,5);assert.equal(secondPage.inquiries.length,2);assert.ok(secondPage.inquiries.every(i=>!firstPage.inquiries.some(j=>i.number===j.number)));
  const input=form();await assert.rejects(repo.create(input,"anonymous:test",null,null,submissionLimits(req("/api",undefined,"",{"x-forwarded-for":"9.9.9.9"}),input.email,null)),{statusCode:429});
 }finally{await fixture.close();}
});

test("reservation inquiry history scopes both roles to the booking, paginates, and includes submitted replies regardless of email status",async()=>{
 const fixture=await createCalendarFixture(),db=await getDatabase(),repo=new InquiryRepository(db);
 try{
  await fixture.repo.createAccount({firebaseUid:"calendar-test-user",name:"本人",contact:"history@example.test",phone:"09012345678"});
  await fixture.repo.createAccount({firebaseUid:"foreign",name:"別人",contact:"foreign@example.test",phone:"09012345678"});
  const booking={name:"本人",email:"history@example.test",phone:"09012345678",date:"2099-11-15",startTime:"12:00",people:10,menuItems:["検証メニュー"],status:"temporary_confirmed" as const};
  const own=await fixture.repo.createReservation({...booking,accountFirebaseUid:"calendar-test-user"});
  const other=await fixture.repo.createReservation({...booking,accountFirebaseUid:"calendar-test-user"});
  const foreign=await fixture.repo.createReservation({...booking,accountFirebaseUid:"foreign"});
  const ownId=(await repo.ownedReservation(own.id,"calendar-test-user")).id,otherId=(await repo.ownedReservation(other.id,"calendar-test-user")).id,foreignId=(await repo.ownedReservation(foreign.id,"foreign")).id;
  const numbers=[];for(let i=0;i<11;i++)numbers.push(await repo.create(form({subject:`この予約の問い合わせ ${i}`}),"user:calendar-test-user","calendar-test-user",ownId,[]));
  await repo.create(form({subject:"別予約の問い合わせ"}),"user:calendar-test-user","calendar-test-user",otherId,[]);
  await repo.create(form({subject:"一般問い合わせ"}),"user:calendar-test-user","calendar-test-user",null,[]);
  await repo.create(form({subject:"他人の予約"}),"user:foreign","foreign",foreignId,[]);
  // Even a historical inconsistent row must not bypass inquiry ownership checks.
  const foreignThread=await repo.create(form({subject:"他人の問い合わせ"}),"user:foreign","foreign",ownId,[]);
  await payload(await controller.reservationInquiryHistory(req("/api"),own.id),401);
  await payload(await controller.reservationInquiryHistory(req("/api",undefined,"invalid"),own.id),401);
  await payload(await controller.reservationInquiryHistory(req("/api",undefined,"calendar-test-member"),own.id,true),403);
  await payload(await controller.reservationInquiryHistory(req("/api",undefined,"calendar-test-member"),foreign.id),403);
  await payload(await controller.reservationInquiryHistory(req("/api",undefined,"calendar-test-admin"),"RSV-999999",true),404);
  for(const query of ["page=0","pageSize=21","page=1&page=2","firebaseUid=foreign","reservationId="+foreign.id])await payload(await controller.reservationInquiryHistory(req(`/api?${query}`,undefined,"calendar-test-member"),own.id),400);
  const response=await controller.reservationInquiryHistory(req("/api?pageSize=2",undefined,"calendar-test-member"),own.id);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  const first=await payload(response,200),second=await payload(await controller.reservationInquiryHistory(req("/api?page=2&pageSize=2",undefined,"calendar-test-member"),own.id),200);
  assert.equal(first.total,11);assert.equal(first.inquiries.length,2);assert.ok(first.inquiries.every((i:{reservationNumber:string;subject:string})=>i.reservationNumber===own.id&&i.subject.startsWith("この予約の問い合わせ")));
  assert.ok(second.inquiries.every((i:{number:string})=>!first.inquiries.some((j:{number:string})=>i.number===j.number)));
  assert.doesNotMatch(JSON.stringify(first),/firebaseUid|requestHash|requestKey|receiptSender/);
  const admin=await payload(await controller.reservationInquiryHistory(req("/api",undefined,"calendar-test-admin"),own.id,true),200);assert.equal(admin.total,12);
  await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),foreignThread),404);
  const number=numbers[0],sentId=await repo.prepareReply(number,{subject:"回答",body:"送信済みの回答本文",requestKey:randomUUID(),revision:1},"admin","管理者");
  const deps:MailDependencies={sender:async()=>sender,client:async()=>({send:async()=>({id:"history-fake-mail"})})};
  await deliverInquiryMail(repo,{number,replyId:sentId},deps);
  await repo.prepareReply(number,{subject:"未送信の回答",body:"メール未送信でも公開する回答本文",requestKey:randomUUID(),revision:(await repo.detail(number)).inquiry.revision},"admin","管理者");
  const customer=await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),number),200),management=await payload(await controller.adminInquiries(req("/api",undefined,"calendar-test-admin"),number),200);
  assert.equal(customer.replies.length,2);assert.equal(customer.replies[0].body,"送信済みの回答本文");assert.equal(customer.replies[1].body,"メール未送信でも公開する回答本文");assert.doesNotMatch(JSON.stringify(customer),/adminLabel|lastError/);
  assert.equal(management.replies.length,2);assert.equal(management.replies[1].emailStatus,"pending");
 }finally{await fixture.close();}
});

test("customer history keeps published answers visible through every mail outcome and a retry without duplicates",async()=>{
 const fixture=await createCalendarFixture(),repo=new InquiryRepository(await getDatabase());
 try{
  const number=await repo.create(form(),"user:calendar-test-user","calendar-test-user",null,[]);
  // Typing or opening the confirmation dialog alone never creates a published reply.
  assert.equal((await repo.detail(number,"calendar-test-user")).replies.length,0);
  const id=await repo.prepareReply(number,{subject:"ご回答",body:"メールが届かなくても履歴で読める回答",requestKey:randomUUID(),revision:1},"private-admin-uid","管理者名");
  async function own(expected:string){
   const response=await controller.myInquiries(req("/api",undefined,"calendar-test-member"),number);
   const body=await payload(response,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
   assert.equal(body.replies.length,1);assert.equal(body.replies[0].id,id);assert.equal(body.replies[0].emailStatus,expected);assert.equal(body.replies[0].body,"メールが届かなくても履歴で読める回答");
   assert.doesNotMatch(JSON.stringify(body),/private-admin-uid|adminLabel|lastError|requestHash|leaseToken/);return body.replies[0];
  }
  const original=await own("pending");
  const claim=await repo.claimMail({number,replyId:id},sender);assert.ok(claim);await own("sending");
  await repo.finishMail({number,replyId:id},claim.token,{error:"failed"});await own("failed");
  const second=await repo.claimMail({number,replyId:id},sender);assert.ok(second);
  await repo.finishMail({number,replyId:id},second.token,{error:"unknown"});await own("unknown");
  const deps:MailDependencies={sender:async()=>sender,client:async()=>({send:async()=>({id:"retried-published-reply"})})};
  await deliverInquiryMail(repo,{number,replyId:id},deps);
  const sent=await own("sent");assert.equal(sent.createdAt,original.createdAt);assert.ok(sent.sentAt);await deliverInquiryMail(repo,{number,replyId:id},deps);await own("sent");
  await payload(await controller.myInquiries(req("/api"),number),401);
  const other=await repo.create(form(),"user:foreign","foreign",null,[]);
  await repo.prepareReply(other,{subject:"別人宛て",body:"別人の回答",requestKey:randomUUID(),revision:1},"private-admin-uid",null);
  await payload(await controller.myInquiries(req("/api",undefined,"calendar-test-member"),other),404);
 }finally{await fixture.close();}
});

test("anonymous availability inquiries accept optional questions and retain meal details through replies and idempotent retries",async()=>{
 const fixture=await createCalendarFixture(),db=await getDatabase(),repo=new InquiryRepository(db);process.env.INQUIRY_FORM_SECRET="test-only-inquiry-form-secret-32-chars";
 try {
  const issued=issueChallenge(req("/api/inquiries/challenge"),Date.now()-3000),challenge=await issued.json(),cookie=issued.headers.get("set-cookie")!.split(";")[0];
  const input={name:"空き状況の確認",email:"availability@example.test",category:"availability",mealDate:"2099-11-16",mealStartTime:"12:30",people:"20",...challenge};
  const accepted=await payload(await controller.submit(req("/api/inquiries",input,"",{cookie})),201);
  const detail=await repo.detail(accepted.number);assert.equal(detail.inquiry.body,"");assert.equal(detail.inquiry.subject,"空き状況について");assert.deepEqual(detail.inquiry.availability,{mealDate:"2099-11-16",mealStartTime:"12:30",people:20});
  assert.equal((await payload(await controller.submit(req("/api/inquiries",input,"",{cookie})),201)).number,accepted.number);
  await payload(await controller.submit(req("/api/inquiries",{...input,people:21},"",{cookie})),409);
  for(const patch of [{mealDate:""},{mealStartTime:""},{people:""}])await payload(await controller.submit(req("/api/inquiries",{...input,...patch},"",{cookie})),400);
  assert.equal((await db.select().from(schema.inquiry)).length,1);
  const receipt=(await db.select().from(schema.emailDelivery))[0];for(const value of ["食事日: 2099/11/16","食事開始時間: 12:30","人数: 20名","その他質問:","記載なし"])assert.ok(receipt.body.includes(value));
  const result=await payload(await controller.reply(req("/api",{subject:"回答",body:"ご案内します。",requestKey:randomUUID(),revision:detail.inquiry.revision},"calendar-test-admin"),accepted.number),200);assert.deepEqual(result.inquiry.availability,detail.inquiry.availability);
  const reply=(await db.select().from(schema.emailDelivery)).find(row=>row.templateKey==="inquiry_reply")!;for(const value of ["食事日: 2099/11/16","食事開始時間: 12:30","人数: 20名","記載なし","ご案内します。"])assert.ok(reply.body.includes(value));
 }finally{await fixture.close();}
});

test("reply template APIs enforce admin rights, validation, active lists, safe retries and immutable sent replies", async () => {
 const fixture = await createCalendarFixture(), db = await getDatabase();
 const collection = await import("../../app/api/admin/inquiry-reply-templates/route");
 const item = await import("../../app/api/admin/inquiry-reply-templates/[id]/route");
 const input = { id: randomUUID(), name: "空席あり", body: "ありがとうございます。\nお席をご用意できます。", isActive: true };
 const context = (id: string) => ({ params: Promise.resolve({ id }) });
 const put = (data: object, token = "calendar-test-admin", origin = "http://localhost") => new Request("http://localhost/api/admin/inquiry-reply-templates/" + input.id, { method: "PUT", headers: { origin, "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(data) });
 try {
  for (const [token, code] of [["", 401], ["calendar-test-member", 403]] as const) {
   await payload(await collection.GET(req("/api/templates", undefined, token)), code);
   await payload(await collection.POST(req("/api/templates", input, token)), code);
   await payload(await item.GET(req("/api/templates", undefined, token), context(input.id)), code);
   await payload(await item.PUT(put({ ...input, revision: 1 }, token), context(input.id)), code);
  }
  const empty = await payload(await collection.GET(req("/api/templates", undefined, "calendar-test-admin")), 200); assert.equal(empty.templates.length, 0);
  const created = (await payload(await collection.POST(req("/api/templates", input, "calendar-test-admin")), 201)).template;
  assert.equal(created.revision, 1); assert.equal(created.body, input.body);
  assert.equal((await payload(await collection.POST(req("/api/templates", input, "calendar-test-admin")), 201)).template.id, input.id);
  await payload(await collection.POST(req("/api/templates", { ...input, body: "changed" }, "calendar-test-admin")), 409);
  for (const patch of [{ name: "" }, { body: "" }, { body: "x".repeat(10001) }, { name: "不正\n名称" }, { isActive: "true" }, { userId: "other" }]) await payload(await collection.POST(req("/api/templates", { ...input, ...patch }, "calendar-test-admin")), 400);
  await payload(await collection.POST(req("/api/templates", { ...input, id: randomUUID() }, "calendar-test-admin", { origin: "https://attacker.example" })), 403);
  await payload(await collection.GET(req("/api/templates?activeOnly=true&activeOnly=false", undefined, "calendar-test-admin")), 400);
  await payload(await collection.GET(req("/api/templates?unknown=x", undefined, "calendar-test-admin")), 400);
  await payload(await item.GET(req("/api/templates", undefined, "calendar-test-admin"), context("bad")), 400);
  await payload(await item.GET(req("/api/templates", undefined, "calendar-test-admin"), context(randomUUID())), 404);
  const get = await item.GET(req("/api/templates", undefined, "calendar-test-admin"), context(input.id));
  assert.match(get.headers.get("cache-control") ?? "", /no-store/); assert.equal(get.headers.get("x-content-type-options"), "nosniff");
  const list = (await payload(await collection.GET(req("/api/templates?activeOnly=true", undefined, "calendar-test-admin")), 200)).templates;
  assert.equal(list.length, 1); assert.equal(list[0].name, input.name); assert.equal("body" in list[0], false);
  const copied = { ...input, id: randomUUID(), name: "空席あり（コピー）" };
  await payload(await collection.POST(req("/api/templates", copied, "calendar-test-admin")), 201);
  const inquiries = new InquiryRepository(db), number = await inquiries.create(form(), "fixture", "owner", null, []);
  await inquiries.prepareReply(number, { subject: "Re: original", body: input.body + "\n個別の補足", requestKey: randomUUID(), revision: 1 }, "calendar-test-user", "管理者");
  const update = { name: "空席あり・改定", body: "別の文例", isActive: false, revision: 1 };
  const race = await Promise.all([item.PUT(put(update), context(input.id)), item.PUT(put({ ...update, body: "競合する文例" }), context(input.id))]);
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
  const saved = (await payload(await item.GET(req("/api/templates", undefined, "calendar-test-admin"), context(input.id)), 200)).template;
  assert.equal(saved.revision, 2); assert.equal(saved.isActive, false);
  await payload(await item.PUT(put({ ...update, revision: 2 }, "calendar-test-admin", "https://attacker.example"), context(input.id)), 403);
  const active = (await payload(await collection.GET(req("/api/templates?activeOnly=true", undefined, "calendar-test-admin")), 200)).templates;
  assert.deepEqual(active.map((t: { id: string }) => t.id), [copied.id]);
  assert.equal((await payload(await collection.GET(req("/api/templates", undefined, "calendar-test-admin")), 200)).templates.length, 2);
  const detail = await inquiries.detail(number, "owner"); assert.equal(detail.replies[0].body, input.body + "\n個別の補足"); assert.equal(detail.replies[0].subject, "Re: original");
  const outbox = (await db.select().from(schema.emailDelivery)).find(mail => mail.templateKey === "inquiry_reply")!;
  assert.ok(outbox.body.includes(input.body + "\n個別の補足")); assert.ok(!outbox.body.includes(saved.body));
  const enabled = (await payload(await item.PUT(put({ name: saved.name, body: saved.body, isActive: true, revision: saved.revision }), context(input.id)), 200)).template;
  assert.equal(enabled.revision, 3); assert.equal(enabled.isActive, true);
 } finally { await fixture.close(); }
});

test("two-state migration preserves history and classifies legacy states from customer-visible answers", async () => {
 const fixture=await createCalendarFixture(),db=await getDatabase(),repo=new InquiryRepository(db);
 try{
  const cases=[
   {uid:null,old:"closed",mail:null,expected:"unhandled"},
   {uid:"member",old:"in_progress",mail:"pending",expected:"answered"},
   {uid:null,old:"answered",mail:"failed",expected:"unhandled"},
   {uid:null,old:"closed",mail:"not_sent",expected:"answered"},
   {uid:"member",old:"closed",mail:"failed",expected:"answered"},
   {uid:null,old:"unhandled",mail:null,expected:"unhandled"},
   {uid:null,old:"in_progress",mail:"sent",expected:"answered"},
  ];
  const rows: { number: string; c: (typeof cases)[number]; before: Awaited<ReturnType<typeof repo.detail>> }[] = [];
  for(const c of cases){
   const number=await repo.create(form({subject:"旧状態の移行",body:"元のお問い合わせを保持"}),"fixture",c.uid,null,[]);
   if(c.mail){const id=await repo.prepareReply(number,{subject:"回答",body:"元の回答を保持",requestKey:randomUUID(),revision:1},"admin",null);await db.update(schema.inquiryReply).set({emailStatus:c.mail as "pending"|"failed"|"sent"|"not_sent"}).where(eq(schema.inquiryReply.id,id));}
   rows.push({number,c,before:await repo.detail(number)});
  }
  const migration=await readFile("drizzle/0020_inquiry_two_statuses.sql","utf8");
  await db.transaction(async tx=>{
   for(const statement of [
    'ALTER TABLE inquiry ALTER COLUMN status DROP DEFAULT',
    'ALTER TABLE inquiry ALTER COLUMN status TYPE text',
    'DROP TYPE public.inquiry_status',
    "CREATE TYPE public.inquiry_status AS ENUM ('unhandled','in_progress','answered','closed')",
    'ALTER TABLE inquiry ALTER COLUMN status TYPE public.inquiry_status USING status::public.inquiry_status',
    "ALTER TABLE inquiry ALTER COLUMN status SET DEFAULT 'unhandled'::public.inquiry_status",
   ])await tx.execute(sql.raw(statement));
   for(const {number,c} of rows)await tx.execute(sql`update inquiry set status=${c.old}::public.inquiry_status where inquiry_number=${Number(number.slice(4))}`);
   for(const statement of migration.split("--> statement-breakpoint").filter(value=>value.trim()))await tx.execute(sql.raw(statement));
  });
  for(const {number,c,before} of rows){
   const after=await repo.detail(number);
   assert.equal(after.inquiry.status,c.expected);
   assert.equal(after.inquiry.revision,before.inquiry.revision+(c.old===c.expected?0:1));
   assert.equal(after.inquiry.body,before.inquiry.body);assert.equal(after.inquiry.email,before.inquiry.email);
   assert.deepEqual(after.replies,before.replies);
  }
  const all=await repo.list({keyword:"",page:1,pageSize:20});assert.equal(all.total,cases.length);
  assert.equal((await repo.list({keyword:"",status:"unhandled",page:1,pageSize:20})).total,3);
  for(const old of ["closed","in_progress"])await assert.rejects(db.execute(sql`update inquiry set status=${old}::public.inquiry_status`));
 }finally{await fixture.close();}
});
