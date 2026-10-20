import { ApiValidationError } from "./api-validation";
export const DEFAULT_RESERVATION_LEAD_DAYS = 3;
export function earliestReservationDate(days: number, now = new Date()) {
  const japanDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(Date.parse(`${japanDay}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function assertReservationLeadTime(date: string, days = DEFAULT_RESERVATION_LEAD_DAYS, now = new Date()) {
  if (date < earliestReservationDate(days, now)) throw new ApiValidationError(`利用日の${days}日前までに申請してください。現在は${earliestReservationDate(days, now)}以降の予約を申請できます。`);
}
