import assert from "node:assert/strict";
import {test} from "node:test";
import {inquirySubmissionSchema,inquiryReplySchema,parseInquiryQuery,inquiryDate,inquiryNumber,parseReservationInquiryQuery} from "../lib/inquiries/types";
import {buildEmailContent} from "../lib/email/email-layout";
const input={name:"氏名",email:"Customer@Example.test",category:"other",subject:"件名",body:"内容",requestKey:"51fed5da-c69b-44d4-801d-fb9571359168"};
test("inquiries validate fields, reject identity/recipient overrides and normalize email",()=>{
 assert.equal(inquirySubmissionSchema.parse(input).email,"customer@example.test");
 for(const patch of [{subject:"A\r\nB"},{body:"x\0y"},{name:""},{email:"wrong"},{body:"a".repeat(5001)},{reservationId:"RSV-1000"},{userId:"foreign"},{to:"foreign@example.test"},{category:"forged"}])assert.equal(inquirySubmissionSchema.safeParse({...input,...patch}).success,false);
 assert.equal(inquiryReplySchema.safeParse({subject:"返信",body:"本文",requestKey:input.requestKey,revision:1,to:input.email}).success,false);
});
test("inquiry query parameters reject ambiguity, oversized pages and unknown filters",()=>{
 assert.deepEqual(parseInquiryQuery(new URL("http://localhost")),{page:1,pageSize:20,keyword:""});
 for(const query of ["page=0","pageSize=101","status=sent","page=1&page=2","userId=foreign"])assert.throws(()=>parseInquiryQuery(new URL(`http://localhost?${query}`)));
 assert.equal(inquiryNumber("INQ-1001"),1001);assert.throws(()=>inquiryNumber("1001"));assert.throws(()=>inquiryNumber("INQ-9999999999"));
 assert.equal(inquiryDate("2026-10-19T23:30:00Z"),"2026/10/20 08:30");
});
test("inquiry email escapes HTML without creating links from untrusted content",()=>{
 const result=buildEmailContent("確認",'<img src=x onerror=alert(1)>\nhttps://example.test/a?x="',{linkify:false});
 assert.doesNotMatch(result.html,/<img|<a\s/);assert.match(result.html,/&lt;img/);assert.equal(result.text,'<img src=x onerror=alert(1)>\nhttps://example.test/a?x="');
});

test("reservation inquiry paging rejects foreign identity and unrelated filters",()=>{
 assert.deepEqual(parseReservationInquiryQuery(new URL("http://localhost")),{page:1,pageSize:10,keyword:""});
 for(const query of ["page=0","pageSize=21","page=1&page=2","reservationId=foreign","firebaseUid=foreign","keyword=secret","__proto__=secret"]){assert.throws(()=>parseReservationInquiryQuery(new URL("http://localhost?"+query)));}
});
