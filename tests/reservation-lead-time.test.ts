import assert from "node:assert/strict";
import { test } from "node:test";
import { assertReservationLeadTime, earliestReservationDate } from "../lib/reservation-lead-time";
import { systemSettingsSchema } from "../lib/system-settings";
test("lead time uses Japan calendar days and permits the exact deadline",()=>{
 const now=new Date("2026-10-16T14:59:59Z");
 for(const days of [0,1,2,3]){
  const date=earliestReservationDate(days,now); assert.equal(date,`2026-10-${16+days}`);assert.doesNotThrow(()=>assertReservationLeadTime(date,days,now));
  assert.throws(()=>assertReservationLeadTime(`2026-10-${15+days}`,days,now));
 }
 assert.equal(earliestReservationDate(3,new Date("2026-10-16T15:00:00Z")),"2026-10-20");
 assert.equal(earliestReservationDate(3,new Date("2026-12-30T03:00:00Z")),"2027-01-02");
 assert.throws(()=>assertReservationLeadTime("2026-10-18",undefined,now));
});
test("lead days setting rejects fractional, negative, missing-field values and supports zero",()=>{
 for(const days of [0,1,2,3,365]) assert.ok(systemSettingsSchema.safeParse({acceptanceCapacity:null,reservationLeadDays:days}).success);
 for(const days of [-1,1.5,366,null,"3"]) assert.equal(systemSettingsSchema.safeParse({acceptanceCapacity:null,reservationLeadDays:days}).success,false);
});
