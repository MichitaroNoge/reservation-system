import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, lte, or, isNull, inArray, sql } from "drizzle-orm";
import { transactionalMailJob as job } from "./db/schema";
import { getDatabase } from "./db/client";
import type { ReservationDatabase } from "./repositories/drizzle-reservation-repository";
import type { ReservationRepository } from "./repositories/reservation-repository";
import { InquiryRepository } from "./inquiries/repository";
import { deliverInquiryMail } from "./inquiries/mail-service";
import { sendReceiptEmailForReservation } from "./services/receipt-email-service";
import { RateLimitError } from "./abuse-limits";
export type MailJobTarget = {
    kind: "reservation_receipt";
    reservationId: string;
} | {
    kind: "inquiry";
    number: string;
    replyId?: string;
};
export function mailJobKey(target: MailJobTarget) { return target.kind === "reservation_receipt" ? "receipt/" + target.reservationId : "inquiry/" + target.number + "/" + (target.replyId ?? "receipt"); }
export async function enqueueMail(db: ReservationDatabase, target: MailJobTarget, retry = false) {
    const key = mailJobKey(target);
    await db.insert(job).values({ key, target }).onConflictDoNothing();
    if (retry)
        await db.update(job).set({ status: "queued", attempts: 0, requestedAt: new Date().toISOString(), availableAt: new Date().toISOString(), leaseUntil: null, leaseToken: null }).where(and(eq(job.key, key), inArray(job.status, ["done", "failed"])));
}
export async function dispatchQueuedMail(repo: ReservationRepository, database?: ReservationDatabase, deliver?: (target: MailJobTarget) => Promise<void>) {
    const db = database ?? await getDatabase();
    let processed = 0;
    const send = deliver ?? (async (target) => { if (target.kind === "reservation_receipt") {
        await sendReceiptEmailForReservation(repo, target.reservationId);
    }
    else {
        await deliverInquiryMail(new InquiryRepository(db), { number: target.number, replyId: target.replyId });
    } });
    for (let i = 0; i < 10; i++) {
        const now = new Date(), token = randomUUID();
        const claimed = await db.transaction(async (tx) => {
            const [row] = await tx.select().from(job).where(and(inArray(job.status, ["queued", "processing"]), lte(job.availableAt, sql `now()`), or(isNull(job.leaseUntil), lte(job.leaseUntil, sql `now()`)))).orderBy(job.availableAt).limit(1).for("update", { skipLocked: true });
            if (!row)
                return null;
            if (row.attempts >= 5 || now.getTime() - Date.parse(row.requestedAt) > 23 * 3600000) {
                await tx.update(job).set({ status: "failed", leaseUntil: null, leaseToken: null }).where(eq(job.key, row.key));
                return { expired: true } as const;
            }
            await tx.update(job).set({ status: "processing", leaseToken: token, leaseUntil: new Date(now.getTime() + 120000).toISOString() }).where(eq(job.key, row.key));
            return row;
        });
        if (!claimed)
            break;
        if ("expired" in claimed)
            continue;
        try {
            await send(claimed.target);
            await db.update(job).set({ status: "done", leaseUntil: null, leaseToken: null }).where(and(eq(job.key, claimed.key), eq(job.leaseToken, token)));
        }
        catch (error) {
            const limited = error instanceof RateLimitError;
            const attempts = claimed.attempts + (limited ? 0 : 1);
            await db.update(job).set({ status: attempts >= 5 ? "failed" : "queued", attempts, availableAt: new Date(Date.now() + (limited ? error.retryAfter : Math.min(3600, 60 * 2 ** claimed.attempts)) * 1000).toISOString(), leaseUntil: null, leaseToken: null }).where(and(eq(job.key, claimed.key), eq(job.leaseToken, token)));
        }
        processed++;
    }
    return { processed };
}
