import { z } from "zod";
import { reservationStatuses } from "./domain";
import { reservationFilters, reservationSortKeys, type ReservationSearch } from "./reservation-search";

const date = z.string().refine(value => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01" && value <= "9999-12-31" && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value), "日付を確認してください。");
export const reservationExportSchema = z.object({
  search: z.string().max(500), dateFrom: date, dateTo: date,
  statuses: z.array(z.enum(reservationStatuses)).max(reservationStatuses.length).refine(values => new Set(values).size === values.length),
  filter: z.enum(reservationFilters), sortKey: z.enum(reservationSortKeys), direction: z.enum(["asc", "desc"]),
}).strict();
export function validateReservationExport(input: unknown): ReservationSearch { return reservationExportSchema.parse(input); }
