import assert from "node:assert/strict";
import {test} from "node:test";
import {calendarDay,calendarDates,calendarLanes,calendarWeek,calendarCapacityWarning} from "../lib/reservation-calendar";
import type{AvailabilityReservation}from"../lib/reservation-availability";
const row=(id:string,startTime:string,endTime:string,people:number,status:AvailabilityReservation["status"]="confirmed"):AvailabilityReservation=>({id,customer:id,date:"2026-10-20",startTime,endTime,people,status,menuItems:[]});
test("calendar peaks count simultaneous occupancy rather than daily totals and do not add TC",()=>{
 const day=calendarDay("2026-10-20",[{...row("a","10:00","11:00",80),tcCount:2},row("b","11:00","12:00",90),row("draft","10:30","11:30",30,"temporary_confirmed"),row("pending","10:00","12:00",999,"confirmed_requested"),row("cancelled","10:00","12:00",999,"cancelled")],[],{acceptanceCapacity:200});
 assert.equal(day.peak,90);assert.equal(day.combinedPeak,120);assert.equal(day.entries.length,4);assert.equal(day.capacity,200);
});
test("calendar clips overnight reservations and blocked periods at day boundaries",()=>{
 const overnight=row("a","23:00","01:00",20);
 const day=calendarDay("2026-10-21",[overnight],[],{blockedPeriods:[{start:"2026-10-20T23:30",end:"2026-10-21T00:30",reason:"点検"},{start:"2026-10-21T12:00",end:"2026-10-22T00:00",reason:"貸切"}]});
 assert.equal(day.entries[0].start,0);assert.equal(day.entries[0].end,60);assert.equal(day.blocks[0].startMinute,0);assert.equal(day.blocks[0].endMinute,30);assert.equal(day.blocks[1].endMinute,1440);
 assert.equal(calendarDay("2026-10-22",[],[],{blockedPeriods:[{start:"2026-10-21T12:00",end:"2026-10-22T00:00",reason:"終了"}]}).blocks.length,0);
});
test("calendar weeks start Monday, handle year boundaries, and validate custom periods",()=>{
 assert.equal(calendarWeek("2026-10-18"),"2026-10-12");assert.equal(calendarWeek("2026-10-19"),"2026-10-19");
 assert.deepEqual(calendarDates("2026-12-31","2027-01-02"),["2026-12-31","2027-01-01","2027-01-02"]);
 assert.deepEqual(calendarDates("2026-10-20","2026-10-19"),[]);assert.deepEqual(calendarDates("",""),[]);
});
test("overlapping calendar bookings use separate lanes and adjacent bookings reuse one",()=>{
 const day=calendarDay("2026-10-20",[row("a","10:00","11:00",10),row("b","10:30","11:30",20),row("c","11:00","12:00",30)],[]);
 const layout=calendarLanes(day.entries);assert.equal(layout.lanes,2);assert.equal(layout.items[0].lane,0);assert.equal(layout.items[1].lane,1);assert.equal(layout.items[2].lane,0);
 assert.equal(calendarDay("2026-10-20",[{...row("a","10:00","11:00",10),endTime:undefined}],[]).uncertain,true);
});

test("capacity warning distinguishes confirmed and temporary overflow without warning at the exact limit",()=>{
 assert.equal(calendarCapacityWarning({capacity:200,peak:100,combinedPeak:250}),"仮予約込みで上限超過");
 assert.equal(calendarCapacityWarning({capacity:200,peak:210,combinedPeak:250}),"本予約で上限超過");
 assert.equal(calendarCapacityWarning({capacity:200,peak:100,combinedPeak:200}),null);
 assert.equal(calendarCapacityWarning({capacity:null,peak:999,combinedPeak:999}),null);
 assert.equal(calendarCapacityWarning({capacity:0,peak:0,combinedPeak:1}),"仮予約込みで上限超過");
});

test("independent overlap groups reclaim full width and short cards do not conceal adjacent bookings",()=>{
 const day=calendarDay("2026-10-20",[row("morning","09:00","09:15",10),row("adjacent","09:15","09:30",10),row("afternoon-a","14:00","15:00",10),row("afternoon-b","14:30","15:00",10),row("evening","18:00","19:00",10)],[]);
 const layout=calendarLanes(day.entries,60);
 assert.equal(layout.items.find(e=>e.reservation.id==="evening")?.lanes,1);
 assert.equal(layout.items.find(e=>e.reservation.id==="afternoon-a")?.lanes,2);
 assert.notEqual(layout.items[0].lane,layout.items[1].lane);
 assert.equal(calendarLanes([day.entries[0]],60).items[0].lanes,1);
});
