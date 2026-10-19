import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { repositoryProvider } from "./db/environment";

export class RateLimitError extends Error {
  statusCode = 429;
  constructor(public readonly retryAfter: number) { super("実行回数の上限に達しました。時間をおいて再度お試しください。"); }
}
export type Limit = { key: string; max: number; seconds: number };
export function nextCounter(count: number, expiresAt: number, now: number, limit: Limit) {
  const active = expiresAt > now;
  if (active && count >= limit.max) throw new RateLimitError(Math.max(1, Math.ceil((expiresAt - now) / 1000)));
  return { count: active ? count + 1 : 1, expiresAt: active ? expiresAt : now + limit.seconds * 1000 };
}

// All buckets are committed atomically; failures deny the operation, never fall back to process memory.
export async function consumeLimits(limits: Limit[]) {
  try {
    if (repositoryProvider() === "drizzle") {
      const [{ getDatabase }, { consumeDatabaseLimits }] = await Promise.all([import("./db/client"), import("./db/abuse-limit-store")]);
      return await consumeDatabaseLimits(await getDatabase(), limits);
    }
    const { getFirebaseAdminApp } = await import("./auth");
    const db = getFirestore(getFirebaseAdminApp());
    return await db.runTransaction(async (transaction) => {
      const refs = limits.map((limit) => db.collection("abuseLimits").doc(createHash("sha256").update(limit.key).digest("hex")));
      const snapshots = await transaction.getAll(...refs);
      const now = Date.now();
      const counters = limits.map((limit, i) => {
        const data = snapshots[i].data();
        return nextCounter(data?.count ?? 0, data?.expiresAt?.toMillis() ?? 0, now, limit);
      });
      counters.forEach((counter, i) => transaction.set(refs[i], { count: counter.count, expiresAt: Timestamp.fromMillis(counter.expiresAt) }));
      return counters;
    });
  } catch (error) {
    if (error instanceof RateLimitError) { console.warn(JSON.stringify({ event: "abuse_limit_exceeded", severity: "WARNING" })); throw error; }
    console.error(JSON.stringify({ event: "abuse_limit_storage_unavailable", severity: "ERROR" }));
    throw Object.assign(new Error("回数制限を確認できません。時間をおいて再度お試しください。"), { statusCode: 503 });
  }
}

const limitedRequests = new WeakSet<Request>();

export async function limitAuthenticatedMutation(request: Request, uid: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method) || limitedRequests.has(request)) return;
  // Trust only a header overwritten by the deployment's ingress. Missing/untrusted IPs share one bucket.
  const header = process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
  const raw = header ? request.headers.get(header)?.trim() : undefined;
  const ip = raw && isIP(raw) ? raw : "unknown";
  await consumeLimits([
    { key: `mutation:uid:${uid}`, max: 30, seconds: 60 },
    { key: `mutation:uid-hour:${uid}`, max: 200, seconds: 3600 },
    { key: `mutation:ip:${ip}`, max: 120, seconds: 60 },
  ]);
  limitedRequests.add(request);
}

export async function limitEmailRecipients(recipients: string[]) {
  const unique = [...new Set(recipients.map((email) => email.trim().toLowerCase()))];
  if (unique.length > 10) throw Object.assign(new Error("メールの宛先は10件までです。"), { statusCode: 400 });
  const limits: Limit[] = unique.flatMap((email) => [
    { key: `email:cooldown:${email}`, max: 1, seconds: 60 },
    { key: `email:hour:${email}`, max: 10, seconds: 3600 },
    { key: `email:day:${email}`, max: 30, seconds: 86400 },
  ]);
  const counters = await consumeLimits([...limits, { key: "email:global", max: 500, seconds: 3600 }]);
  const count = counters[counters.length - 1].count;
  console.info(JSON.stringify({ event: "email_send_attempt", severity: count >= 400 ? "WARNING" : "INFO", hourlyCount: count, recipientCount: unique.length }));
}
