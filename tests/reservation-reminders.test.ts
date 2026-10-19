import assert from "node:assert/strict";
import { test } from "node:test";
import { isReservationReminderTarget } from "../lib/reservation-reminders";
const row={status:"temporary_confirmed" as const,date:"2026-10-16",menuItems:[]};
test("booking reminders exclude past and one-calendar-month boundary, and only include approved temporary reservations",()=>{
 for(const date of ["2026-10-16","2026-11-15"]) assert.equal(isReservationReminderTarget({...row,date},"booking","2026-10-16"),true);
 for(const date of ["2026-10-15","2026-11-16","2026-12-01"]) assert.equal(isReservationReminderTarget({...row,date},"booking","2026-10-16"),false);
 for(const status of ["temporary_requested","temporary_rejected","confirmed","cancelled"] as const) assert.equal(isReservationReminderTarget({...row,status},"booking","2026-10-16"),false);
 assert.equal(isReservationReminderTarget({...row,date:"2027-02-27"},"booking","2027-01-31"),true);
 assert.equal(isReservationReminderTarget({...row,date:"2027-02-28"},"booking","2027-01-31"),false);
});
test("menu reminders include only upcoming confirmed or visit-waiting reservations with no menus",()=>{
 for(const status of ["confirmed","waiting_for_visit"] as const){assert.equal(isReservationReminderTarget({...row,status},"menu","2026-10-16"),true);assert.equal(isReservationReminderTarget({...row,status,menuItems:["料理"]},"menu","2026-10-16"),false);assert.equal(isReservationReminderTarget({...row,status,date:"2026-10-15"},"menu","2026-10-16"),false);}
 for(const status of ["temporary_confirmed","confirmed_requested","visited","cancelled","cancellation_requested"] as const) assert.equal(isReservationReminderTarget({...row,status},"menu","2026-10-16"),false);
});
