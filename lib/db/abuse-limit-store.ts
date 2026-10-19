import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { nextCounter, type Limit } from "../abuse-limits";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { abuseLimit } from "./schema";

/** Durable, all-or-nothing buckets. Sorted transaction locks prevent competing requests bypassing limits. */
export async function consumeDatabaseLimits(database: ReservationDatabase, limits: Limit[], now = Date.now()) {
  const buckets = limits.map(limit => ({ limit, key: createHash("sha256").update(limit.key).digest("hex") }));
  if (new Set(buckets.map(bucket => bucket.key)).size !== buckets.length) throw new Error("Duplicate rate-limit bucket.");
  return database.transaction(async transaction => {
    for (const key of buckets.map(bucket => bucket.key).sort()) {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`abuse-limit:${key}`}, 0))`);
    }
    const counters = [];
    for (const { limit, key } of buckets) {
      const [existing] = await transaction.select().from(abuseLimit).where(eq(abuseLimit.bucketKey, key));
      const counter = nextCounter(existing?.count ?? 0, existing ? new Date(existing.expiresAt).getTime() : 0, now, limit);
      const values = { bucketKey: key, count: counter.count, expiresAt: new Date(counter.expiresAt).toISOString() };
      await transaction.insert(abuseLimit).values(values).onConflictDoUpdate({ target: abuseLimit.bucketKey, set: values });
      counters.push(counter);
    }
    return counters;
  });
}
