import assert from "node:assert/strict";
import { test } from "node:test";
import { systemSettingsSchema } from "../lib/system-settings";
import { reservationAvailability, type AvailabilityReservation } from "../lib/reservation-availability";
const target: AvailabilityReservation = { id:"request",customer:"予約者",date:"2026-10-20",startTime:"12:00",endTime:"13:00",people:40,status:"confirmed_requested",menuItems:[] };
const period = {start:"2026-10-20T12:30",end:"2026-10-20T14:00",reason:"設備点検"};
test("blocked periods match any overlap, retain reasons, and exclude touching boundaries",()=>{
  assert.deepEqual(reservationAvailability(target,[],200,[],[period]).blockedPeriods,[period]);
  for(const block of [{...period,start:"2026-10-20T13:00"},{...period,start:"2026-10-20T11:00",end:"2026-10-20T12:00"},{...period,start:"2026-10-21T12:00",end:"2026-10-21T13:00"}]) assert.equal(reservationAvailability(target,[],200,[],[block]).blockedPeriods.length,0);
  assert.equal(reservationAvailability(target,[],200,[],[{...period,start:"2026-10-20T00:00",end:"2026-10-21T00:00"}]).blockedPeriods.length,1);
  assert.equal(reservationAvailability({...target,startTime:"23:30",endTime:"00:30"},[],200,[],[{...period,start:"2026-10-21T00:00",end:"2026-10-21T01:00"}]).blockedPeriods.length,1);
  assert.equal(reservationAvailability({...target,endTime:undefined},[],200,[],[period]).blockedPeriods.length,1);
});
test("settings validate actual calendar dates, positive ranges and optional reasons",()=>{
  assert.ok(systemSettingsSchema.safeParse({acceptanceCapacity:200,blockedPeriods:[period]}).success);
  assert.ok(systemSettingsSchema.safeParse({acceptanceCapacity:null,blockedPeriods:[]}).success);
  for(const block of [{...period,end:period.start},{...period,end:"2026-10-19T12:00"},{...period,start:"2026-02-30T12:00"},{...period,start:"2026-10-20T25:00"},{...period,start:""},{...period,reason:"あ".repeat(201)}]) assert.equal(systemSettingsSchema.safeParse({acceptanceCapacity:200,blockedPeriods:[block]}).success,false);
});
