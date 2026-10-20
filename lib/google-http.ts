import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiAuthError } from "./auth";
import { RateLimitError } from "./abuse-limits";
import { GoogleAuthError } from "./google-auth";
export function googleErrorResponse(error: unknown) {
  const safe = error instanceof GoogleAuthError || error instanceof ApiAuthError || error instanceof RateLimitError;
  const status = safe ? error.statusCode : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503;
  return NextResponse.json({ error: safe ? error.message : status === 400 ? "入力内容を確認してください。" : "認証処理を完了できませんでした。時間をおいて再度お試しください。" }, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...(error instanceof RateLimitError ? { "Retry-After": String(error.retryAfter) } : {}) } });
}
export async function readGoogleJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new GoogleAuthError("JSON形式で送信してください。", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new GoogleAuthError("入力内容を確認してください。");
  const chunks: Uint8Array[] = []; let length = 0;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new GoogleAuthError("送信がタイムアウトしました。もう一度お試しください。", 408)); void reader.cancel().catch(() => {}); }, 10000); });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]); if (done) break;
      length += value.byteLength;
      if (length > 16384) { await reader.cancel(); throw new GoogleAuthError("認証情報が大きすぎます。", 413); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { clearTimeout(timer!); reader.releaseLock(); }
}
