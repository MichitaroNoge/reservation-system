import { and, or, eq, gte, lte, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { reservation as r } from "./db/schema";
import { normalizedDateRange, type ReservationSearch } from "./reservation-search";
import { toDataConnectReservationStatus, reservationStatusLabels } from "./domain";
const reservationId = sql.raw('"reservation"."id"');
export const booked = sql `${r.status} in ('CONFIRMED','WAITING_FOR_VISIT')`;
export const noMenus = sql `not exists(select 1 from reservation_detail d where d.reservation_id=${reservationId})`;
export const noAssignments = sql `not exists(select 1 from store_assignment a where a.reservation_id=${reservationId})`;
export const ready = sql `${booked} and not (${noMenus}) and not (${noAssignments}) and not exists(select 1 from store_assignment a where a.reservation_id=${reservationId} and a.people<=0) and (select sum(a.people) from store_assignment a where a.reservation_id=${reservationId})=${r.expectedPeople} and ${r.confirmationContactedAt} is not null`;
export const expired = (today: string) => sql `${r.status}='TEMPORARY_CONFIRMED' and ${r.usageDate}< (${today}::date + interval '1 month')::date`;
export function reservationWhere(query: ReservationSearch, today: string): SQL | undefined {
    const range = normalizedDateRange(query), keyword = query.search.trim();
    const pattern = '%' + keyword.replace(/[\\%_]/g, '\\$&') + '%';
    const filters: Record<string, SQL> = { "承認待ち": sql `${r.status} in ('TEMPORARY_REQUESTED','CONFIRMED_REQUESTED','CANCELLATION_REQUESTED')`, "仮予約確定": eq(r.status, 'TEMPORARY_CONFIRMED'), "仮予約確定（期限切れ）": expired(today), "本予約確定": booked, "本予約確定（メニュー未確定）": sql `${booked} and ${noMenus}`, "本予約確定（店舗未割当）": sql `${booked} and ${noAssignments}`, "本予約確定（未確認連絡）": sql `${booked} and ${r.confirmationContactedAt} is null`, "本予約確定（来店待ち）": ready };
    return and(range.from ? gte(r.usageDate, range.from) : undefined, range.to ? lte(r.usageDate, range.to) : undefined, query.statuses.length ? inArray(r.status, query.statuses.map(toDataConnectReservationStatus)) : undefined, keyword ? or(ilike(r.reservationCode, pattern), ilike(r.reserverName, pattern), ilike(r.groupName, pattern), ilike(r.reserverPhone, pattern), ilike(r.reserverEmail, pattern)) : undefined, filters[query.filter]);
}
export function reservationSortExpression(key: ReservationSearch['sortKey'], today: string): SQL {
    if (key === 'id')
        return sql `regexp_replace(${r.reservationCode},'[^0-9]','','g')`;
    if (key === 'date')
        return sql `${r.usageDate}::text || 'T' || coalesce(nullif(${r.usageTime},''),'10:00')`;
    if (key === 'customer')
        return sql `coalesce(${r.reserverName},'')`;
    if (key === 'contact')
        return sql `case when ${r.confirmationContactedAt} is null then '未連絡' else '連絡済み' || to_char(${r.confirmationContactedAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end`;
    if (key === 'menu')
        return sql `coalesce((select string_agg(m.name,'、') from reservation_detail d join menu m on m.id=d.menu_id cross join lateral generate_series(1,greatest(1,d.quantity)) n where d.reservation_id=${reservationId}),'メニュー未確定')`;
    if (key === 'store')
        return sql `coalesce((select string_agg(st.name || ' ' || a.people::text || '名',' / ') from store_assignment a join store st on st.id=a.store_id where a.reservation_id=${reservationId}),'未割当')`;
    const cases = Object.entries(reservationStatusLabels).map(([status, label]) => sql `when ${toDataConnectReservationStatus(status as keyof typeof reservationStatusLabels)} then ${status === 'waiting_for_visit' ? '本予約確定（来店待ち）' : label}`);
    return sql `case when ${expired(today)} then '仮予約確定（期限切れ）' else case ${r.status} ${sql.join(cases, sql ` `)} end end`;
}
