import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { repositoryProvider } from "../db/environment";
import { getDatabase } from "../db/client";
import { account, emailDelivery, inquiry, inquiryReply, reservation } from "../db/schema";
import { consumeDatabaseLimits } from "../db/abuse-limit-store";
import type { Limit } from "../abuse-limits";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { InquiryError, inquiryDate, inquiryNumber, type Inquiry, type InquiryDetail, type InquiryQuery, type SenderSnapshot } from "./types";
export { InquiryError } from "./types";
export const conflict = () => new InquiryError("情報が更新されています。再読み込みして確認してください。");
export const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Row = typeof inquiry.$inferSelect;
type ReplyRow = typeof inquiryReply.$inferSelect;
export type MailTarget = {
    number: string;
    replyId?: string;
};
const mailKey = (row: Row, reply?: ReplyRow) => reply ? `inquiry-reply:${reply.id}` : `inquiry-receipt:${row.id}`;
function publicRow(row: Row, reservationNumber: string | null): Inquiry {
    return { number: `INQ-${row.inquiryNumber}`, reservationNumber, name: row.name, email: row.email, category: row.category, subject: row.subject, body: row.body, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, revision: row.revision, receiptEmailStatus: row.receiptEmailStatus };
}
export class InquiryRepository {
    constructor(public db: ReservationDatabase) { }
    private async locked<T>(key: string, work: (repo: InquiryRepository) => Promise<T>): Promise<T> {
        return this.db.transaction(async (tx) => {
            await tx.execute(sql `select pg_advisory_xact_lock(hashtextextended(${`inquiry:${key}`},0))`);
            return work(new InquiryRepository(tx as unknown as ReservationDatabase));
        });
    }
    async ownedReservation(code: string, uid: string) {
        if (!/^RSV-[0-9]{1,25}$/.test(code))
            throw new InquiryError("予約が見つかりません。", 404);
        const [row] = await this.db.select({ id: reservation.id, number: reservation.reservationCode }).from(reservation).innerJoin(account, eq(account.id, reservation.accountId)).where(and(eq(reservation.reservationCode, code), eq(account.firebaseUid, uid), eq(account.active, true)));
        if (!row)
            throw new InquiryError("この予約へのアクセス権限がありません。", 403);
        return row;
    }
    async reservationHistory(code: string, query: InquiryQuery, uid?: string) {
        if (!/^RSV-[0-9]{1,25}$/.test(code)) throw new InquiryError("予約が見つかりません。", 404);
        const booking = uid === undefined
            ? (await this.db.select({ id: reservation.id }).from(reservation).where(eq(reservation.reservationCode, code)))[0]
            : await this.ownedReservation(code, uid);
        if (!booking) throw new InquiryError("予約が見つかりません。", 404);
        return this.list(query, uid, booking.id);
    }
    async row(number: string, uid?: string) {
        const [result] = await this.db.select({ row: inquiry, reservationNumber: reservation.reservationCode }).from(inquiry).leftJoin(reservation, eq(reservation.id, inquiry.reservationId)).where(and(eq(inquiry.inquiryNumber, inquiryNumber(number)), uid === undefined ? undefined : eq(inquiry.firebaseUid, uid)));
        if (!result)
            throw new InquiryError("問い合わせが見つかりません。", 404);
        return result;
    }
    async detail(number: string, uid?: string): Promise<InquiryDetail> {
        const { row, reservationNumber } = await this.row(number, uid);
        // Replies are saved only on explicit submission; email delivery does not control history visibility.
        const replies = await this.db.select().from(inquiryReply).where(eq(inquiryReply.inquiryId, row.id)).orderBy(inquiryReply.createdAt, inquiryReply.id);
        return { inquiry: publicRow(row, reservationNumber), replies: replies.map(r => ({ id: r.id, subject: r.subject, body: r.body, emailStatus: r.emailStatus, sentAt: r.sentAt, createdAt: r.createdAt, ...(uid === undefined ? { adminLabel: r.adminLabel, lastError: r.lastError } : {}) })) };
    }
    async list(query: InquiryQuery, uid?: string, reservationId?: string) {
        const escaped = query.keyword.replace(/[\\%_]/g, "\\$&");
        const where = and(reservationId === undefined ? undefined : eq(inquiry.reservationId, reservationId), uid === undefined ? undefined : eq(inquiry.firebaseUid, uid), query.status ? eq(inquiry.status, query.status) : undefined, query.category ? eq(inquiry.category, query.category) : undefined, escaped ? or(ilike(inquiry.subject, `%${escaped}%`), ilike(inquiry.name, `%${escaped}%`), ilike(inquiry.email, `%${escaped}%`), sql `('INQ-' || ${inquiry.inquiryNumber}::text) ilike ${`%${escaped}%`}`) : undefined);
        const rows = await this.db.select({ row: inquiry, reservationNumber: reservation.reservationCode }).from(inquiry).leftJoin(reservation, eq(inquiry.reservationId, reservation.id)).where(where).orderBy(desc(inquiry.createdAt), desc(inquiry.id)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
        const [total] = await this.db.select({ count: count() }).from(inquiry).where(where);
        return { inquiries: rows.map(r => publicRow(r.row, r.reservationNumber)), total: total.count, page: query.page, pageSize: query.pageSize };
    }
    async create(input: {
        name: string;
        email: string;
        category: Row["category"];
        subject: string;
        body: string;
        requestKey: string;
    }, actor: string, uid: string | null, reservationId: string | null, limits: Limit[]) {
        const requestHash = hash({ input, actor, reservationId });
        return this.locked(`request:${input.requestKey}`, async (repo) => {
            const [existing] = await repo.db.select().from(inquiry).where(eq(inquiry.requestKey, input.requestKey));
            if (existing) {
                if (existing.requestHash !== requestHash)
                    throw new InquiryError("同じ送信識別子で内容を変更できません。", 409);
                return `INQ-${existing.inquiryNumber}`;
            }
            await consumeDatabaseLimits(repo.db, limits);
            const [row] = await repo.db.insert(inquiry).values({ ...input, requestHash, firebaseUid: uid, reservationId }).returning();
            const { reservationNumber } = await repo.row(`INQ-${row.inquiryNumber}`);
            const body = [`お問い合わせを受け付けました。`, `問い合わせ番号: INQ-${row.inquiryNumber}`, `受付日時: ${inquiryDate(row.createdAt)}`, reservationNumber ? `予約番号: ${reservationNumber}` : "", `件名: ${row.subject}`, "", row.body].filter(v => v !== "").join("\n");
            await repo.db.insert(emailDelivery).values({ deliveryKey: mailKey(row), templateKey: "inquiry_receipt", recipient: row.email, subject: `[INQ-${row.inquiryNumber}] お問い合わせ受付`, body, status: "pending" });
            return `INQ-${row.inquiryNumber}`;
        });
    }
    async prepareReply(number: string, input: {
        subject: string;
        body: string;
        requestKey: string;
        revision: number;
    }, adminUid: string, adminLabel: string | null) {
        return this.locked(number, async (repo) => {
            const { row, reservationNumber } = await repo.row(number);
            const requestHash = hash({ subject: input.subject, body: input.body, adminUid, number });
            const [existing] = await repo.db.select().from(inquiryReply).where(eq(inquiryReply.requestKey, input.requestKey));
            if (existing) {
                if (existing.requestHash !== requestHash || existing.inquiryId !== row.id)
                    throw new InquiryError("同じ送信識別子で内容を変更できません。");
                return existing.id;
            }
            if (row.revision !== input.revision)
                throw conflict();
            if (row.status === "closed")
                throw new InquiryError("完了した問い合わせです。対応中に戻してから回答してください。");
            const pending = await repo.db.select({ id: inquiryReply.id }).from(inquiryReply).where(and(eq(inquiryReply.inquiryId, row.id), sql `${inquiryReply.emailStatus} <> 'sent'`)).limit(1);
            if (pending.length)
                throw new InquiryError("未送信の回答があります。回答履歴から同じ回答を再試行してください。");
            const [reply] = await repo.db.insert(inquiryReply).values({ inquiryId: row.id, adminFirebaseUid: adminUid, adminLabel, subject: input.subject, body: input.body, requestKey: input.requestKey, requestHash }).returning();
            const body = [`問い合わせ番号: ${number}`, reservationNumber ? `予約番号: ${reservationNumber}` : "", "", reply.body].join("\n");
            await repo.db.insert(emailDelivery).values({ deliveryKey: mailKey(row, reply), templateKey: "inquiry_reply", recipient: row.email, subject: reply.subject, body, status: "pending" });
            await repo.db.update(inquiry).set({ revision: row.revision + 1, updatedAt: new Date().toISOString() }).where(eq(inquiry.id, row.id));
            return reply.id;
        });
    }
    async setStatus(number: string, status: "in_progress" | "closed", revision: number) {
        return this.locked(number, async (repo) => {
            const { row } = await repo.row(number);
            if (row.revision !== revision)
                throw conflict();
            const [active] = await repo.db.select({ id: inquiryReply.id }).from(inquiryReply).where(and(eq(inquiryReply.inquiryId, row.id), sql `${inquiryReply.emailStatus} <> 'sent'`)).limit(1);
            if (active)
                throw new InquiryError("送信結果が未確定の回答があります。回答履歴を確認してください。");
            await repo.db.update(inquiry).set({ status, revision: revision + 1, updatedAt: new Date().toISOString() }).where(eq(inquiry.id, row.id));
        });
    }
    async frozenSender(target: MailTarget) {
        const { row } = await this.row(target.number);
        if (!target.replyId)
            return row.receiptSender;
        const [reply] = await this.db.select().from(inquiryReply).where(and(eq(inquiryReply.id, target.replyId), eq(inquiryReply.inquiryId, row.id)));
        if (!reply)
            throw new InquiryError("回答が見つかりません。", 404);
        return reply.sender;
    }
    async claimMail(target: MailTarget, sender: SenderSnapshot, now = Date.now()) {
        return this.locked(target.number, async (repo) => {
            const { row } = await repo.row(target.number);
            const reply = target.replyId ? (await repo.db.select().from(inquiryReply).where(and(eq(inquiryReply.id, target.replyId), eq(inquiryReply.inquiryId, row.id))))[0] : undefined;
            if (target.replyId && !reply)
                throw new InquiryError("回答が見つかりません。", 404);
            const status = reply?.emailStatus ?? row.receiptEmailStatus;
            if (status === "sent")
                return null;
            const first = reply ? reply.firstAttemptAt : row.receiptFirstAttemptAt;
            const lease = reply ? reply.leaseUntil : row.receiptLeaseUntil;
            const attempts = reply ? reply.attempts : row.receiptAttempts;
            if (lease && Date.parse(lease) > now)
                throw new InquiryError("メールを送信中です。少し待って再読み込みしてください。");
            if (first && (now - Date.parse(first) > 23 * 3600000 || attempts >= 5))
                throw new InquiryError("安全な再送期限または試行回数を超えました。Resendの送信履歴を管理者が確認してください。");
            const token = randomUUID(), time = new Date(now).toISOString(), until = new Date(now + 60000).toISOString();
            const frozen = (reply ? reply.sender : row.receiptSender) ?? sender;
            if (reply)
                await repo.db.update(inquiryReply).set({ emailStatus: "sending", firstAttemptAt: first ?? time, lastAttemptAt: time, attempts: attempts + 1, leaseUntil: until, leaseToken: token, sender: frozen }).where(eq(inquiryReply.id, reply.id));
            else
                await repo.db.update(inquiry).set({ receiptEmailStatus: "sending", receiptFirstAttemptAt: first ?? time, receiptLastAttemptAt: time, receiptAttempts: attempts + 1, receiptLeaseUntil: until, receiptLeaseToken: token, receiptSender: frozen }).where(eq(inquiry.id, row.id));
            const [delivery] = await repo.db.select().from(emailDelivery).where(eq(emailDelivery.deliveryKey, mailKey(row, reply)));
            if (!delivery)
                throw new InquiryError("送信記録が見つかりません。管理者にお問い合わせください。", 503);
            return { token, sender: frozen, delivery };
        });
    }
    async finishMail(target: MailTarget, token: string, result: {
        id: string;
    } | {
        error: "failed" | "unknown";
    }) {
        return this.locked(target.number, async (repo) => {
            const { row } = await repo.row(target.number);
            const reply = target.replyId ? (await repo.db.select().from(inquiryReply).where(and(eq(inquiryReply.id, target.replyId), eq(inquiryReply.inquiryId, row.id))))[0] : undefined;
            if (target.replyId && !reply)
                throw new InquiryError("回答が見つかりません。", 404);
            if ((reply ? reply.leaseToken : row.receiptLeaseToken) !== token)
                throw conflict();
            const sent = "id" in result, status = sent ? "sent" : result.error, time = new Date().toISOString();
            if (reply) {
                await repo.db.update(inquiryReply).set({ emailStatus: status, resendMessageId: sent ? result.id : null, sentAt: sent ? time : null, leaseUntil: null, leaseToken: null, lastError: sent ? null : status }).where(eq(inquiryReply.id, reply.id));
                if (sent)
                    await repo.db.update(inquiry).set({ status: "answered", revision: row.revision + 1, updatedAt: time }).where(eq(inquiry.id, row.id));
            }
            else
                await repo.db.update(inquiry).set({ receiptEmailStatus: status, receiptMessageId: sent ? result.id : null, receiptLeaseUntil: null, receiptLeaseToken: null }).where(eq(inquiry.id, row.id));
            await repo.db.update(emailDelivery).set({ status, sentAt: sent ? time : null, lastError: sent ? null : status }).where(eq(emailDelivery.deliveryKey, mailKey(row, reply)));
        });
    }
}
export async function inquiryRepository() {
  if (repositoryProvider() !== "drizzle") throw new InquiryError("問い合わせ機能にはDrizzleのDB設定が必要です。",503);
  return new InquiryRepository(await getDatabase());
}
