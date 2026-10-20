import "server-only";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError, type Limit } from "../abuse-limits";
import { InquiryError, hash } from "./repository";
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
export function inquiryError(error: unknown) {
    if (error instanceof ZodError)
        return json({ error: "入力内容を確認してください。", fields: error.flatten().fieldErrors }, 400);
    if (error instanceof RateLimitError) {
        const result = json({ error: error.message }, 429);
        result.headers.set("Retry-After", String(error.retryAfter));
        return result;
    }
    if (error instanceof InquiryError)
        return json({ error: error.message }, error.statusCode);
    if (error && typeof error === "object" && "statusCode" in error && [401, 403].includes(Number(error.statusCode)))
        return json({ error: "ログイン状態とアクセス権限を確認してください。" }, Number(error.statusCode));
    console.error(JSON.stringify({ event: "inquiry_operation_failed", severity: "ERROR" }));
    return json({ error: "処理を完了できませんでした。時間をおいて再度お試しください。" }, 503);
}
export function sameOrigin(request: Request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    if (origin !== url.origin || request.headers.get("sec-fetch-site") === "cross-site")
        throw new InquiryError("この画面から再度操作してください。", 403);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
        throw new InquiryError("安全な接続が必要です。", 403);
}
export async function readBody(request: Request) {
    if (!(request.headers.get("content-type") ?? "").startsWith("application/json"))
        throw new InquiryError("JSON形式で送信してください。", 415);
    const reader = request.body?.getReader();
    if (!reader)
        throw new InquiryError("入力内容がありません。", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > 32768) {
                await reader.cancel();
                throw new InquiryError("入力内容が大きすぎます。", 413);
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    }
    catch {
        throw new InquiryError("入力形式を確認してください。", 400);
    }
}
const cookieName = "inquiry_form";
function secret() { const value = process.env.INQUIRY_FORM_SECRET; if (!value || value.length < 32)
    throw new InquiryError("問い合わせフォームの準備ができていません。管理者にお問い合わせください。", 503); return value; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
function cookie(request: Request) { return (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? ""; }
export function issueChallenge(request: Request, now = Date.now()) {
    const url = new URL(request.url), origin = request.headers.get("origin");
    if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site")
        throw new InquiryError("この画面から再度操作してください。", 403);
    const existing = cookie(request), browser = /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomBytes(32).toString("base64url");
    const requestKey = randomUUID(), value = Buffer.from(JSON.stringify({ key: requestKey, browser: hash(browser), at: now })).toString("base64url");
    const response = json({ requestKey, formToken: `${value}.${sign(value)}` });
    response.headers.set("Set-Cookie", `${cookieName}=${browser}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=1800${url.protocol === "https:" ? "; Secure" : ""}`);
    return response;
}
export function verifyChallenge(request: Request, token: string | undefined, key: string, now = Date.now()) {
    if (!token || token.length > 2048)
        throw new InquiryError("フォームを再読み込みして送信してください。", 403);
    const [value, signature, ...extra] = token.split(".");
    if (!signature || extra.length)
        throw new InquiryError("フォームを再読み込みして送信してください。", 403);
    const expected = sign(value), a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
        throw new InquiryError("フォームを再読み込みして送信してください。", 403);
    let data: {
        key: string;
        browser: string;
        at: number;
    };
    try {
        data = JSON.parse(Buffer.from(value, "base64url").toString());
    }
    catch {
        throw new InquiryError("フォームを再読み込みして送信してください。", 403);
    }
    if (data.key !== key || !cookie(request) || data.browser !== hash(cookie(request)) || !Number.isFinite(data.at) || now - data.at < 2000 || now - data.at > 1800000)
        throw new InquiryError("少し待って再送信してください。時間が経過した場合はフォームを再読み込みしてください。", 403);
    return `anonymous:${data.browser}`;
}
export function submissionLimits(request: Request, email: string, uid: string | null): Limit[] {
    const header = process.env.RATE_LIMIT_TRUSTED_IP_HEADER, raw = header ? request.headers.get(header)?.trim() : null, ip = raw && isIP(raw) ? raw : "unknown";
    return [{ key: `inquiry:recipient-minute:${email}`, max: 1, seconds: 60 }, { key: `inquiry:recipient-hour:${email}`, max: 3, seconds: 3600 }, ...(uid ? [{ key: `inquiry:uid:${uid}`, max: 10, seconds: 3600 }] : [{ key: `inquiry:anonymous-ip:${ip}`, max: 5, seconds: 3600 }, { key: "inquiry:anonymous-global", max: 50, seconds: 3600 }])];
}
