import { createHash, randomUUID } from "node:crypto";
import { ApiAuthError, requireAdmin } from "@/lib/auth";
import { consumeLimits, RateLimitError } from "@/lib/abuse-limits";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryProvider } from "@/lib/db/environment";
import { validateReservationExport } from "@/lib/reservation-export-validation";
import { exportFileName } from "@/lib/csv/reservation-export";
import { checkExportDeadline, ExportError, generateReservationExport } from "@/lib/services/reservation-export-service";
import { exportTimeoutMs } from "@/lib/reservation-export-policy";

export const runtime = "nodejs";
export const maxDuration = 35;
let running = 0;
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
async function readBody(request: Request, signal: AbortSignal) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ExportError(415, "CONTENT_TYPE", "JSON形式で送信してください。");
  if (Number(request.headers.get("content-length")) > 8192) throw new ExportError(413, "BODY_SIZE", "検索条件が大きすぎます。");
  const reader = request.body?.getReader();
  if (!reader) throw new ExportError(400, "QUERY", "検索条件を指定してください。");
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      checkExportDeadline(signal, Infinity);
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new ExportError(413, "BODY_SIZE", "検索条件が大きすぎます。"); }
      chunks.push(value);
    }
    checkExportDeadline(signal, Infinity);
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
    catch { throw new ExportError(400, "QUERY", "検索条件のJSONを確認してください。"); }
  } finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
}
export async function POST(request: Request) {
  const started = Date.now(), deadline = started + exportTimeoutMs, operationId = randomUUID();
  const controller = new AbortController();
  let actor: string | undefined;
  const disconnect = () => controller.abort();
  request.signal.addEventListener("abort", disconnect, { once: true });
  if (request.signal.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const audit = (result: string, count = 0) => console.info(JSON.stringify({ event: "reservation_csv_export", operationId, actor, at: new Date().toISOString(), result, count, durationMs: Date.now() - started }));
  const work = async () => {
    const user = await requireAdmin(request); // Existing global-admin policy authorizes CSV export.
    actor = createHash("sha256").update(user.uid).digest("hex");
    checkExportDeadline(controller.signal, deadline);
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ExportError(403, "ORIGIN", "この画面からの出力は許可されていません。");
    if (repositoryProvider() !== "drizzle") throw new ExportError(503, "UNSUPPORTED", "CSV出力はDrizzle構成でのみ利用できます。");
    await consumeLimits([{ key: `csv:minute:${user.uid}`, max: 2, seconds: 60 }, { key: `csv:hour:${user.uid}`, max: 20, seconds: 3600 }, { key: "csv:global", max: 10, seconds: 60 }]);
    checkExportDeadline(controller.signal, deadline);
    if (running >= 2) throw new ExportError(429, "BUSY", "出力処理が混雑しています。少し待って再実行してください。");
    running++;
    try {
      let query;
      const input = await readBody(request, controller.signal);
      try { query = validateReservationExport(input); } catch { throw new ExportError(400, "QUERY", "検索条件の日付・ステータス・並び順を確認してください。"); }
      const result = await generateReservationExport(await getReservationRepository(), query, controller.signal, deadline);
      await requireAdmin(request); // Revocation/permission revalidation before releasing the file.
      checkExportDeadline(controller.signal, deadline);
      return result;
    } finally { running--; }
  };
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ExportError(504, "TIMEOUT", "出力処理が30秒を超えました。条件を絞って再実行してください。")); }, exportTimeoutMs); });
    const result = await Promise.race([work(), timeout]);
    audit("generated", result.count);
    return new Response(new Uint8Array(result.buffer), { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8; header=present", "Content-Disposition": `attachment; filename="${exportFileName(new Date())}"`, "Content-Length": String(result.buffer.byteLength), "X-Export-Count": String(result.count) } });
  } catch (error) {
    const status = error instanceof ExportError ? error.status : error instanceof ApiAuthError ? error.statusCode : error instanceof RateLimitError ? 429 : 500;
    const code = error instanceof ExportError ? error.code : status === 401 || status === 403 ? "AUTH" : status === 429 ? "RATE_LIMIT" : "FAILED";
    const message = error instanceof ExportError ? error.message : status === 401 ? "管理者としてログインしてください。" : status === 403 ? "CSV出力権限がありません。" : status === 429 ? "CSV出力の回数制限に達しました。時間をおいて再実行してください。" : "CSV出力に失敗しました。時間をおいて再実行してください。";
    audit(code);
    return Response.json({ error: message, code }, { status, headers: { ...privateHeaders, ...(status === 429 ? { "Retry-After": String(error instanceof RateLimitError ? error.retryAfter : 60) } : {}) } });
  } finally { if (timer) clearTimeout(timer); request.signal.removeEventListener("abort", disconnect); }
}
