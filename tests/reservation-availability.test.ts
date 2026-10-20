import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalDecision, reservationAvailability, reservationApplicationDetails, type AvailabilityReservation } from "../lib/reservation-availability";
import { validateStoreInput } from "../lib/api-validation";
import type { Reservation } from "../lib/domain";
const row = (id: string, startTime: string, endTime: string, people: number, status: AvailabilityReservation["status"] = "confirmed"): AvailabilityReservation => ({ id, customer: id, date: "2026-10-20", startTime, endTime, people, status, menuItems: [] });
const capacity = 200;
test("availability counts simultaneous peaks, includes unassigned bookings, and excludes the current reservation", () => {
  const target = row("request", "12:00", "14:00", 40, "confirmed_requested");
  const data = reservationAvailability(target, [target, row("a", "11:00", "13:00", 80), row("b", "13:00", "15:00", 90), row("draft", "12:30", "13:30", 30, "temporary_confirmed"), row("waiting", "12:00", "14:00", 20, "confirmed_requested"), row("cancelled", "12:00", "14:00", 999, "cancelled"), row("boundary", "14:00", "15:00", 999)], capacity, []);
  assert.equal(data.bookedPeak, 90); assert.equal(data.combined, 160); assert.equal(data.remaining, 70); assert.equal(data.pendingPeak, 20); assert.equal(data.overlaps.length, 4);
  assert.equal(data.bookedAtPeak, 90); assert.equal(data.temporaryAtPeak, 30);
});
test("category maxima are not added when they occur at different times", () => {
  const target = row("request", "12:00", "14:00", 40);
  const data = reservationAvailability(target, [row("a", "12:00", "13:00", 130), row("b", "13:00", "14:00", 50), row("draft", "13:00", "14:00", 70, "temporary_confirmed")], capacity, []);
  assert.equal(data.combined, 170); assert.equal(data.bookedAtPeak, 130); assert.equal(data.temporaryAtPeak, 0);
});
test("global capacity supports unset and explicit zero independently of stores", () => {
  const target = row("request", "12:00", "13:00", 40);
  assert.equal(reservationAvailability(target, [], null, []).capacity, null);
  assert.equal(reservationAvailability(target, [], null, []).remaining, null);
  assert.equal(reservationAvailability(target, [], 0, []).remaining, -40);
  assert.equal(validateStoreInput({name:"A",capacity:0}).capacity, 0);
  assert.equal(validateStoreInput({name:"A",capacity:null}).capacity, null);
  assert.throws(() => validateStoreInput({name:"A",capacity:-1})); assert.throws(() => validateStoreInput({name:"A",capacity:1.5}));
});
test("overnight reservations, cancellation requests and temporary-to-confirmed requests retain occupied capacity", () => {
  const target = row("request", "00:30", "01:30", 10);
  const overnight = {...row("previous", "23:00", "01:00", 30, "cancellation_requested"), date:"2026-10-19"};
  const pendingChange = {...row("change", "00:30", "01:30", 20, "confirmed_requested"), requestType:"confirmed_from_temporary" as const};
  const data = reservationAvailability(target, [overnight,pendingChange], capacity, []);
  assert.equal(data.combined, 60); assert.equal(data.bookedPeak,30); assert.equal(data.pendingPeak,0);
  assert.equal(approvalDecision("confirmed_requested", "confirmed_from_temporary")?.reject, "temporary_confirmed");
  assert.equal(approvalDecision("confirmed"), null);
});
test("missing usage times are flagged and never treated as zero-duration reservations", () => {
  const target = row("request", "12:00", "13:00", 40);
  const unknown = {...row("unknown", "11:00", "12:00", 100), endTime:undefined};
  assert.equal(reservationAvailability(target, [unknown], capacity, []).uncertain,true);
  assert.equal(reservationAvailability(target, [unknown], capacity, []).bookedPeak,100);
});
test("application details include every submitted contact, group, menu, payment, remarks and consent field", () => {
  const r: Reservation = {...row("request","12:00","13:00",40), menuItems:["料理A","料理B"], totalAmount:1, store:null, received:"2026-10-16T00:00:00Z",phone:"09000000000",email:"contact@example.test",address:"住所",accountType:"travel_agency",companyBranchName:"支店",contactPersonName:"担当者",bookingType:"travel_agency_group",bookingContactName:"予約担当者",dayContactName:"当日担当者",dayContactPhone:"08000000000",groupName:"団体",groupNameKana:"ダンタイ",groupType:"その他",groupTypeOther:"その他の詳細",tcCount:0,dgCount:2,paymentCondition:"other",remarks:"特記事項\n二行目",policyAgreement:{kind:"confirmed",acceptedAt:"2026-10-16T01:00:00Z"}};
  const details=reservationApplicationDetails(r);
  for(const value of ["支店","担当者","予約担当者","当日担当者","08000000000","団体","ダンタイ","その他の詳細","料理A、料理B","特記事項\n二行目","2026-10-16T01:00:00Z"]) assert.ok(details.some(row=>row.value===value),value);
  assert.equal(details.find(row=>row.label==="TC人数")?.value,"0");
});

test("TC is included in the submitted people count and is never added again",()=>{
 const target={...row("request","12:00","13:00",40),tcCount:2,dgCount:5};
 const occupied={...row("booked","12:00","13:00",100),tcCount:3,dgCount:10};
 const result=reservationAvailability(target,[occupied],capacity,[]);
 assert.equal(result.current,40);assert.equal(result.bookedPeak,100);assert.equal(result.remaining,60);assert.equal(result.combined,140);
});
