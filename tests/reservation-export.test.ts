import assert from "node:assert/strict";
import { test } from "node:test";
import { csvLine, safeCsvText } from "../lib/csv/encoding";
import { exportFileName, japaneseDateTime, reservationCsvHeader, reservationCsvRow, reservationExportColumns } from "../lib/csv/reservation-export";
import { compareReservations, matchesReservation, type ReservationSearch } from "../lib/reservation-search";
import { validateReservationExport } from "../lib/reservation-export-validation";
import { ExportError, generateReservationExport, exportMaxBytes } from "../lib/services/reservation-export-service";
import type { ReservationRepository } from "../lib/repositories/reservation-repository";
import type { Reservation } from "../lib/domain";

const query: ReservationSearch = { search: "", dateFrom: "", dateTo: "", statuses: [], filter: "すべて", sortKey: "id", direction: "asc" };
const today = "2026-10-19";
const row = (id = "RSV-2"): Reservation => ({ id, customer: "予約者", date: "2026-11-20", startTime: "12:00", endTime: "13:00", people: 12, phone: "09000000000", email: "test@example.test", status: "confirmed", menuItems: [], totalAmount: 10000, store: null, received: "2026-10-18T15:30:00Z" });
const repository = (rows: Reservation[], batchSize = 500) => ({ async scanReservationsForExport(_query: ReservationSearch, consume: (batch: Reservation[]) => void) { for (let i = 0; i < rows.length; i += batchSize) consume(rows.slice(i, i + batchSize)); } }) as Pick<ReservationRepository, "scanReservationsForExport">;
const generate = (rows: Reservation[], q = query) => generateReservationExport(repository(rows), q, new AbortController().signal, Date.now() + 30000, new Date(`${today}T00:00:00Z`));

// Independent CSV reader used to verify boundaries, quoted multiline cells and escaped quotes.
function readCsv(csv: string) {
  const rows: string[][] = []; let cells: string[] = [], value = "", quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === ",") { cells.push(value); value = ""; }
    else if (!quoted && c === "\r" && input[i + 1] === "\n") { cells.push(value); rows.push(cells); cells = []; value = ""; i++; }
    else value += c;
  }
  assert.equal(quoted, false); assert.deepEqual(cells, []); return rows;
}

test("CSV query rejects unknown scope, sort injection, malformed dates, duplicate statuses and overlong search", () => {
  assert.deepEqual(validateReservationExport(query), query);
  for (const change of [{ dateFrom: "2026-02-30" }, { dateTo: "2026-13-01" }, { sortKey: "id;drop table reservation" }, { userId: "other-user" }, { storeId: "other-store" }, { tenantId: "other" }, { statuses: ["confirmed", "confirmed"] }, { statuses: ["ALL"] }, { search: "x".repeat(501) }, { direction: "sideways" }]) assert.throws(() => validateReservationExport({ ...query, ...change }));
});

test("shared filters preserve keyword fields, reversed inclusive dates, empty statuses and approval categories", () => {
  const r = { ...row(), groupName: "団体,東京" };
  for (const search of ["rSv-2", "予約者", "東京", "0900", "TEST@EXAMPLE"]) assert.equal(matchesReservation(r, { ...query, search }, today), true);
  assert.equal(matchesReservation(r, { ...query, dateFrom: "2026-11-21", dateTo: "2026-11-20" }, today), true);
  assert.equal(matchesReservation(r, { ...query, dateTo: "2026-11-19" }, today), false);
  assert.equal(matchesReservation(r, { ...query, statuses: ["cancelled"] }, today), false);
  for (const status of ["temporary_requested", "confirmed_requested", "cancellation_requested"] as const) assert.equal(matchesReservation({ ...r, status }, { ...query, filter: "承認待ち" }, today), true);
  assert.equal(matchesReservation(r, { ...query, filter: "本予約確定（店舗未割当）" }, today), true);
  assert.equal(matchesReservation({ ...r, status: "temporary_confirmed", date: "2026-11-18" }, { ...query, filter: "仮予約確定（期限切れ）" }, today), true);
  const sorted = [row("RSV-10"), row("RSV-2")].sort((a,b) => compareReservations(a,b,query,today));
  assert.deepEqual(sorted.map(r => r.id), ["RSV-2", "RSV-10"]);
});

test("CSV separates escaping from formula protection, including whitespace, controls and Japanese starters", () => {
  for (const text of ["=1+2", "+SUM(A1)", "-1+2", "@SUM(A1)", " \t\r\n=1", "\u200B=1", "\u0000+1", "＝1+2", "＋1", "－1", "＠1"]) assert.equal(safeCsvText(text), "\t" + text);
  for (const text of ["株式会社テスト", "a=b", "090-1234-5678", "", " normal"]) assert.equal(safeCsvText(text), text);
  const values = ['東京,"支店"\r\n2階', '=1,"next",@A1', "通常", -123, 0];
  assert.deepEqual(readCsv(csvLine(values)), [[values[0], "\t" + values[1], "通常", "-123", "0"]]);
  assert.deepEqual(readCsv(csvLine(["一行目\n二行目\r三行目"])), [["一行目\r\n二行目\r\n三行目"]]);
});

test("Japanese headers, BOM, JST dates, snapshot PII, amount and one-to-many assignments produce one row", async () => {
  const r = { ...row(), address: "東京都,新宿区", remarks: '備考"確認"\r\n2行目', menuItems: ["料理A", "料理B"], storeAssignments: [{ store: "新宿店", people: 6 }, { store: "渋谷店", people: 6 }], tcCount: 2 };
  const result = await generate([r]);
  assert.deepEqual([...result.buffer.subarray(0,3)], [239,187,191]);
  const parsed = readCsv(result.buffer.toString("utf8"));
  assert.equal(parsed.length, 2); assert.equal(parsed[0].length, 31); assert.equal(parsed[1].length, 31);
  const cell = (header: string) => parsed[1][parsed[0].indexOf(header)];
  assert.equal(cell("住所"), r.address); assert.equal(cell("備考"), r.remarks); assert.equal(cell("予約金額（円）"), "10000");
  assert.equal(cell("受付日時"), "2026-10-19 00:30:00"); assert.equal(cell("店舗割当"), "新宿店：6名 / 渋谷店：6名");
  assert.equal(cell("予約人数"), "12"); assert.equal(cell("T/C人数"), "2");
  assert.equal(exportFileName(new Date(r.received)), "reservations_20261019_003000.csv");
  assert.equal(japaneseDateTime("invalid"), "");
  assert.equal(reservationExportColumns.some(column => /UUID|トークン|パスワード|アカウントID/.test(column.header)), false);
});

test("export includes every matching row over a DB batch and sorts in the requested direction", async () => {
  const rows = Array.from({ length: 1201 }, (_,i) => row(`RSV-${i+1}`));
  const result = await generate(rows, { ...query, direction: "desc" });
  const parsed = readCsv(result.buffer.toString("utf8"));
  assert.equal(result.count, 1201); assert.equal(parsed.length, 1202); assert.equal(parsed[1][0], "RSV-1201"); assert.equal(parsed.at(-1)?.[0], "RSV-1");
});

test("10,000 reservations complete within the approved time and output-size budgets", async () => {
  const started = performance.now(), before = process.memoryUsage().heapUsed;
  const result = await generate(Array.from({ length: 10000 }, (_,i) => ({ ...row(`RSV-${i+1}`), address: "東京都・検証住所", remarks: "検証用の備考".repeat(30) })));
  const elapsed = performance.now() - started;
  assert.equal(result.count, 10000); assert.ok(result.buffer.byteLength <= exportMaxBytes); assert.ok(elapsed < 30000);
  console.info(JSON.stringify({ event: "csv_capacity_test", count: result.count, bytes: result.buffer.byteLength, durationMs: Math.round(elapsed), heapDeltaMiB: Math.round((process.memoryUsage().heapUsed-before)/1024/1024) }));
});

test("empty, row, size, unsupported backend and deadline limits reject without returning a partial CSV", async () => {
  await assert.rejects(generate([]), error => error instanceof ExportError && error.code === "EMPTY");
  await assert.rejects(generate(Array.from({ length: 10001 }, (_,i) => row(`RSV-${i}`))), error => error instanceof ExportError && error.code === "ROW_LIMIT");
  await assert.rejects(generate([{ ...row(), remarks: "x".repeat(exportMaxBytes) }]), error => error instanceof ExportError && error.code === "SIZE_LIMIT");
  await assert.rejects(generateReservationExport({} as ReservationRepository, query, new AbortController().signal, Date.now()+100), error => error instanceof ExportError && error.code === "UNSUPPORTED");
  await assert.rejects(generateReservationExport(repository([row()]), query, AbortSignal.abort(), Date.now()+100), error => error instanceof ExportError && error.code === "TIMEOUT");
  assert.ok(reservationCsvHeader().endsWith("\r\n")); assert.ok(reservationCsvRow(row(), today).endsWith("\r\n"));
});
