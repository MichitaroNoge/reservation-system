import { createHash } from "node:crypto";
import type { ApprovalEmailDelivery, ApprovalEmailType, Reservation } from "../domain";
import type { ReservationRepository } from "../repositories/reservation-repository";
import { repositoryTransaction } from "../repositories/transaction";
import { reservationNotificationSnapshot } from "./reservation-notification-state";
import { approvalEmailDeliveryKey, sendApprovalEmailDelivery } from "./approval-email-service";
const recoveryPrefix = (key: string) => "recovery-" + createHash("sha256").update(key).digest("hex").slice(0,16) + "-";
function notificationType(r: Reservation): ApprovalEmailType | null {
  if (r.status === "cancelled") return "cancellation_approved";
  return ["temporary_confirmed", "confirmed", "waiting_for_visit"].includes(r.status) ? "reservation_approved" : null;
}
export async function reservationNotificationProblems(repo: ReservationRepository) {
  const [deliveries, bookings] = await Promise.all([repo.listApprovalEmailDeliveries(), repo.listReservations()]);
  const outstanding = deliveries.filter(d => {
    if (d.sentAt || deliveries.some(other => other.referenceId?.startsWith(recoveryPrefix(d.deliveryKey)))) return false;
    const booking = bookings.find(r => r.id === d.reservationId);
    const current = booking && reservationNotificationSnapshot(booking);
    // A newer notice already covers the current booking; keep superseded records in the audit only.
    return !deliveries.some(other => other.deliveryKey !== d.deliveryKey && other.reservationId === d.reservationId && other.snapshotKey === current && (!other.stoppedAt || other.sentAt) && (other.sentAt || d.snapshotKey !== current || other.requestedAt > d.requestedAt || (other.requestedAt === d.requestedAt && other.deliveryKey > d.deliveryKey)));
  });
  return { total: outstanding.length, notifications: outstanding.slice(0,50).map(d => {
    const booking = bookings.find(r => r.id === d.reservationId);
    return { deliveryKey: d.deliveryKey, reservationId: d.reservationId, revision: booking?.revision ?? 0,
      date: booking?.date, people: booking?.people, status: booking?.status, canSendCurrent: !!booking && !!notificationType(booking),
      state: d.stoppedAt ? "停止中" : d.retryCount >= 5 ? "要確認" : d.nextAttemptAt ? "送信制限による待機中" : "再試行待ち",
      lastAttemptAt: d.lastAttemptAt, nextAttemptAt: d.nextAttemptAt };
  }) };
}
/** Explicit admin confirmation only. Never reset an ambiguous provider key for automatic retry. */
export async function recoverReservationNotification(repo: ReservationRepository, key: string, revision: number, action: "send_current" | "record_sent") {
  const queued = (await repo.listApprovalEmailDeliveries()).find(d => d.deliveryKey === key);
  if (!queued) throw Object.assign(new Error("通知が見つかりません。"), { statusCode: 404 });
  const nextKey = await repositoryTransaction(repo, "reservation:" + queued.reservationId, async tx => {
    const deliveries = await tx.listApprovalEmailDeliveries();
    const original = deliveries.find(d => d.deliveryKey === key)!;
    const replacement = deliveries.find(d => d.referenceId?.startsWith(recoveryPrefix(key)));
    if (replacement) {
      if (action === "send_current") return replacement.deliveryKey;
      throw Object.assign(new Error("最新内容の通知が既に作成されています。再読み込みし、新しい通知の送信履歴を確認してください。"), { statusCode: 409 });
    }
    if (original.sentAt) return null;
    const booking = (await tx.listReservations()).find(r => r.id === original.reservationId);
    if (!booking || (booking.revision ?? 0) !== revision) throw Object.assign(new Error("予約内容が更新されています。再読み込みして確認してください。"), { statusCode: 409 });
    const now = new Date().toISOString();
    if (action === "record_sent") {
      const auditKey = "reservation-approval/" + key, audit = await tx.getEmailDelivery(auditKey);
      if (audit) await tx.updateEmailDelivery(auditKey, { status: "sent", sentAt: now, lastError: null });
      await tx.updateApprovalEmailDelivery(key, { sentAt: now, lastAttemptAt: now, retryCount: original.retryCount, lastError: null });
      return null;
    }
    const type = notificationType(booking);
    if (!type) throw Object.assign(new Error("現在の予約は承認済みまたはキャンセル確定の状態ではありません。予約の状態を確認してください。"), { statusCode: 409 });
    const referenceId = recoveryPrefix(key) + reservationNotificationSnapshot(booking).slice(0,16);
    const deliveryKey = approvalEmailDeliveryKey(booking.id, type, referenceId);
    await tx.createApprovalEmailDelivery({ deliveryKey, reservationId: booking.id, type, referenceId, requestedAt: now });
    await tx.updateApprovalEmailDelivery(key, { stoppedAt: now, lastAttemptAt: original.lastAttemptAt ?? now, retryCount: original.retryCount, lastError: "管理者が最新内容の通知を作成しました。" });
    return deliveryKey;
  });
  if (!nextKey) return "送信履歴の確認結果を記録しました。";
  const result: ApprovalEmailDelivery = await sendApprovalEmailDelivery(repo, nextKey);
  return result.sentAt ? "最新の予約内容で通知を送信しました。" : "最新内容の通知を保存しました。送信状況を確認してください。";
}
