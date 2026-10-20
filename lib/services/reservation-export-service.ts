import type { ReservationRepository } from "../repositories/reservation-repository";
import { compareReservationSortValues, reservationSortValue, matchesReservation, type ReservationSearch } from "../reservation-search";
import { japaneseDateTime, reservationCsvHeader, reservationCsvRow } from "../csv/reservation-export";

import { exportMaxRows, exportMaxBytes, ExportError, checkExportDeadline } from "../reservation-export-policy";
export { exportMaxRows, exportMaxBytes, ExportError, checkExportDeadline } from "../reservation-export-policy";
export async function generateReservationExport(repository: Pick<ReservationRepository, "scanReservationsForExport">, query: ReservationSearch, signal: AbortSignal, deadline: number, now = new Date()) {
  if (!repository.scanReservationsForExport) throw new ExportError(503, "UNSUPPORTED", "CSV出力はDrizzle構成でのみ利用できます。");
  const today = japaneseDateTime(now.toISOString()).slice(0, 10);
  const header = reservationCsvHeader();
  let bytes = Buffer.byteLength(header);
  const rows: { sortValue: string | number; csv: string }[] = [];
  await repository.scanReservationsForExport(query, batch => {
    for (const reservation of batch) {
      checkExportDeadline(signal, deadline);
      if (!matchesReservation(reservation, query, today)) continue;
      if (rows.length >= exportMaxRows) throw new ExportError(413, "ROW_LIMIT", "出力は10,000件以内です。条件を絞ってください。");
      const csv = reservationCsvRow(reservation, today);
      bytes += Buffer.byteLength(csv);
      if (bytes > exportMaxBytes) throw new ExportError(413, "SIZE_LIMIT", "出力サイズが20MiBを超えます。条件を絞ってください。");
      rows.push({ sortValue: reservationSortValue(reservation, query.sortKey, today), csv });
    }
  }, signal, deadline);
  checkExportDeadline(signal, deadline);
  if (!rows.length) throw new ExportError(422, "EMPTY", "出力対象の予約はありません。");
  rows.sort((a, b) => compareReservationSortValues(a.sortValue, b.sortValue, query.direction));
  checkExportDeadline(signal, deadline);
  return { buffer: Buffer.from(header + rows.map(row => row.csv).join(""), "utf8"), count: rows.length };
}
