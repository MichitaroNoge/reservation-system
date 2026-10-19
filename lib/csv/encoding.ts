/** Formula neutralization is deliberately separate from CSV boundary escaping. */
export function safeCsvText(value: string) {
  // Excel ignores various whitespace/control prefixes; include Japanese full-width starters.
  return /^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(value) ? "\t" + value : value;
}
export function escapeCsvCell(value: string) { return '"' + value.replace(/\r\n|\r|\n/g, "\r\n").replaceAll('"', '""') + '"'; }
export function csvLine(values: readonly (string | number)[]) {
  return values.map(value => escapeCsvCell(typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : safeCsvText(value))).join(",") + "\r\n";
}
