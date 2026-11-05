import { z } from "zod";
import { and, lte, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getDatabase } from "@/lib/db/client";
import { reservation as r, systemSettings } from "@/lib/db/schema";
import { DrizzleReservationRepository } from "@/lib/repositories/drizzle-reservation-repository";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s);
const query = z.object({ from: date, to: date }).strict().refine(q => q.to >= q.from && Date.parse(q.to) - Date.parse(q.from) <= 365 * 86400000);
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const { from, to } = query.parse(readSearchParams(request));
        const db = await getDatabase();
        const effectiveEnd = sql `(${r.usageDate} + case when ${r.usageTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then ${r.usageTime}::time else time '00:00' end +
    (case when ${r.usageTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${r.usageEndTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${r.usageEndTime}<>${r.usageTime}
      then extract(epoch from (${r.usageEndTime}::time - ${r.usageTime}::time))/60 + case when ${r.usageEndTime}<${r.usageTime} then 1440 else 0 end
      else coalesce(nullif((select max(m.duration_minutes) from reservation_detail d join menu m on m.id=d.menu_id where d.reservation_id=${r.id}),0),1440) end)*interval '1 minute')`;
        const rows = await new DrizzleReservationRepository(db).readReservationRows(and(lte(r.usageDate, to), sql `${effectiveEnd}>${from}::date`));
        const [settings] = await db.select().from(systemSettings).limit(1);
        return Response.json({ reservations: rows, settings: settings ?? { acceptanceCapacity: null, reservationLeadDays: 3, blockedPeriods: [] } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    catch (error) {
        return apiErrorResponse(error);
    }
}
function readSearchParams(request: Request) { const params = new URL(request.url).searchParams; for (const key of params.keys())
    if (params.getAll(key).length !== 1)
        throw new z.ZodError([{ code: "custom", path: [key], message: "条件が重複しています。" }]); return Object.fromEntries(params); }
