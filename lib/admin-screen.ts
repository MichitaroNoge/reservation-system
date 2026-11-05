import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import "server-only";
import { getDatabase } from "./db/client";
import { inquiry, reservationChangeRequest as change, reservation as r } from "./db/schema";
import { DrizzleReservationRepository } from "./repositories/drizzle-reservation-repository";
import { earliestReservationDate } from "./reservation-lead-time";
import { booked, expired, noAssignments, noMenus } from "./reservation-read-query";
export async function readAdminScreen(view: string, windowDays = 7) {
    const db = await getDatabase(), repo = new DrizzleReservationRepository(db), today = earliestReservationDate(0);
    const due = and(eq(r.status, 'CONFIRMED'), sql `${r.confirmationContactedAt} is null`, gte(r.usageDate, today), sql `${r.usageDate}<(${today}::date + ${windowDays}::int)`)!;
    const approval = sql `${r.status} in ('TEMPORARY_REQUESTED','CONFIRMED_REQUESTED') and coalesce(${r.requestType},'')<>'confirmed_from_temporary'`;
    const confirmedChange = and(eq(r.status, 'CONFIRMED_REQUESTED'), eq(r.requestType, 'confirmed_from_temporary'))!;
    const temporary = expired(today), assignments = sql `${booked} and ${noAssignments}`, menu = sql `${booked} and ${noMenus}`;
    const [counts] = await db.select({ today: sql<number> `count(*) filter(where ${r.usageDate}=${today})::int`, month: sql<number> `count(*) filter(where to_char(${r.usageDate},'YYYY-MM')=${today.slice(0, 7)})::int`, reservationApprovals: sql<number> `count(*) filter(where ${approval})::int`, cancellationApprovals: sql<number> `count(*) filter(where ${r.status}='CANCELLATION_REQUESTED')::int`, confirmedReservationRequests: sql<number> `count(*) filter(where ${confirmedChange})::int`, temporaryExpired: sql<number> `count(*) filter(where ${temporary} and ${r.usageDate}>=${today})::int`, storeUnassigned: sql<number> `count(*) filter(where ${assignments})::int`, menuUnselected: sql<number> `count(*) filter(where ${menu} and ${r.usageDate}>=${today})::int`, preContact: sql<number> `count(*) filter(where ${booked} and ${r.confirmationContactedAt} is null)::int`, preContactDue: sql<number> `count(*) filter(where ${due})::int` }).from(r);
    const [{ total: changeRequests }] = await db.select({ total: sql<number> `count(*)::int` }).from(change).where(eq(change.status, 'REQUESTED'));
    const [{ total: unansweredInquiries }] = await db.select({ total: sql<number> `count(*)::int` }).from(inquiry).where(eq(inquiry.status, "unhandled"));
    const conditions: Record<string, SQL> = { dashboard: eq(r.usageDate, today), reservationApprovals: approval, confirmedReservationRequests: confirmedChange, cancellationApprovals: eq(r.status, 'CANCELLATION_REQUESTED'), confirmationContacts: due, storeAssignments: assignments, bookingReminders: and(temporary, gte(r.usageDate, today))!, menuReminders: and(menu, gte(r.usageDate, today))!, reservationChangeRequests: sql `${r.id} in (select reservation_id from reservation_change_request where status='REQUESTED')` };
    const [reservations, requests] = await Promise.all([conditions[view] ? repo.readReservationRows(conditions[view]) : Promise.resolve([]), view === 'reservationChangeRequests' ? repo.readChangeRequests(eq(change.status, 'REQUESTED')) : Promise.resolve([])]);
    const { today: todayCount, month, ...tasks } = counts;
    return { summary: { today: todayCount, month, tasks: { ...tasks, changeRequests, unansweredInquiries } }, reservations, requests };
}
