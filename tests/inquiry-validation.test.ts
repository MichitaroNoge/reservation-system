import assert from "node:assert/strict";
import {test} from "node:test";
import {generalInquiryCategories,reservationInquiryCategories,inquiryCategories,generalInquirySubmissionSchema,inquirySubmissionSchema,inquiryReplySchema,inquiryStatuses,parseInquiryQuery,inquiryDate,inquiryNumber,parseReservationInquiryQuery} from "../lib/inquiries/types";
import {inquiryAvailabilitySchema,inquiryMessageText} from "../lib/inquiries/availability";
import {buildEmailContent} from "../lib/email/email-layout";
const availabilityFields={mealDate:"2099-11-15",mealStartTime:"12:00",people:24};
const input={name:"氏名",email:"Customer@Example.test",category:"other",subject:"件名",body:"内容",requestKey:"51fed5da-c69b-44d4-801d-fb9571359168"};
test("inquiries validate fields, reject identity/recipient overrides and normalize email",()=>{
 assert.equal(inquirySubmissionSchema.parse(input).email,"customer@example.test");
 for(const patch of [{subject:"A\r\nB"},{body:"x\0y"},{name:""},{email:"wrong"},{body:"a".repeat(5001)},{reservationId:"RSV-1000"},{userId:"foreign"},{to:"foreign@example.test"},{category:"forged"}])assert.equal(inquirySubmissionSchema.safeParse({...input,...patch}).success,false);
 assert.equal(inquiryReplySchema.safeParse({subject:"返信",body:"本文",requestKey:input.requestKey,revision:1,to:input.email}).success,false);
});
test("inquiry query parameters reject ambiguity, oversized pages and unknown filters",()=>{
 assert.deepEqual(parseInquiryQuery(new URL("http://localhost")),{page:1,pageSize:20,keyword:""});
 for(const query of ["page=0","pageSize=101","status=sent","status=in_progress","status=closed","page=1&page=2","userId=foreign"])assert.throws(()=>parseInquiryQuery(new URL(`http://localhost?${query}`)));
 assert.deepEqual(inquiryStatuses,{unhandled:"未回答",answered:"回答済"});
 for(const status of ["unhandled","answered"])assert.equal(parseInquiryQuery(new URL("http://localhost?status="+status)).status,status);
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


test("new general inquiries offer availability and other only while historical categories stay readable",()=>{
 assert.deepEqual(Object.values(generalInquiryCategories),["空き状況について","その他"]);
 assert.deepEqual(Object.values(reservationInquiryCategories),["予約について"]);
 for(const category of ["availability","other"])assert.equal(generalInquirySubmissionSchema.safeParse({...input,...(category==="availability"?availabilityFields:{}),category}).success,true);
 for(const category of ["reservation","service","forged"])assert.equal(generalInquirySubmissionSchema.safeParse({...input,category}).success,false);
 assert.equal(inquirySubmissionSchema.safeParse({...input,category:"reservation"}).success,true);
 assert.equal(inquiryCategories.service,"サービスについて");
 assert.equal(parseInquiryQuery(new URL("http://localhost?category=availability")).category,"availability");
});


test("availability inquiries require a real date, a start time and a positive whole number of people but no free-text question",()=>{
 const data={...input,...availabilityFields,category:"availability",subject:"",body:""};
 assert.equal(generalInquirySubmissionSchema.safeParse(data).success,true);
 assert.equal(generalInquirySubmissionSchema.safeParse({...data,subject:undefined,body:undefined}).success,true);
 for(const patch of [{mealDate:undefined},{mealDate:""},{mealDate:"2099-02-29"},{mealDate:"0000-01-01"},{mealStartTime:undefined},{mealStartTime:""},{mealStartTime:"24:00"},{mealStartTime:"12:60"},{people:undefined},{people:""},{people:0},{people:-1},{people:1.5},{people:"abc"},{people:2147483648}])assert.equal(generalInquirySubmissionSchema.safeParse({...data,...patch}).success,false,JSON.stringify(patch));
 assert.equal(inquiryAvailabilitySchema.parse({...availabilityFields,people:"24"}).people,24);
 assert.equal(inquiryAvailabilitySchema.safeParse({...availabilityFields,mealDate:"2028-02-29"}).success,true);
 assert.equal(generalInquirySubmissionSchema.safeParse({...input,subject:""}).success,false);
 assert.equal(generalInquirySubmissionSchema.safeParse({...input,body:""}).success,false);
});

test("availability message formatting includes all requested details without changing legacy inquiries",()=>{
 const text=inquiryMessageText({category:"availability",availability:availabilityFields,body:"<img src=x onerror=alert(1)>"});
 for(const field of ["食事日: 2099/11/15","食事開始時間: 12:00","人数: 24名","その他質問:"])assert.ok(text.includes(field));
 assert.match(buildEmailContent("空き状況について",text,{linkify:false}).html,/&lt;img/);
 assert.doesNotMatch(buildEmailContent("空き状況について",text,{linkify:false}).html,/<img/);
 assert.match(inquiryMessageText({category:"availability",availability:availabilityFields,body:""}),/記載なし/);
 assert.equal(inquiryMessageText({category:"availability",body:"過去の問い合わせ"}),"過去の問い合わせ");
 assert.equal(inquiryMessageText({category:"other",body:"本文"}),"本文");
});
