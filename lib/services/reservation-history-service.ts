import { randomUUID } from "node:crypto";
import type { Reservation } from "../domain";
import { reservationSnapshot, type HistoryActor, type HistoryKind, type ReservationSnapshot } from "../reservation-history";
import type { ReservationRepository } from "../repositories/reservation-repository";

export async function requestHistory(repo: ReservationRepository, reservation: Reservation, options: { kind: HistoryKind; actor: HistoryActor | null; before?: ReservationSnapshot | null; requested?: ReservationSnapshot | null; referenceId?: string; reason?: string; legacy?: boolean; eventKey?: string; requestedAt?: string | null }) {
  if (!repo.createReservationHistory) return;
  const existing = (await repo.listReservationHistory?.(reservation.id))?.find(row => row.kind === options.kind && row.status === "requested" && row.referenceId === (options.referenceId ?? null));
  if (existing) return existing;
  return repo.createReservationHistory({ id: randomUUID(), eventKey: options.eventKey ?? `${options.kind}:${reservation.id}:${options.referenceId ?? randomUUID()}`, reservationCode: reservation.id, kind: options.kind, status: "requested", referenceId: options.referenceId ?? null,
    requestedAt: options.legacy ? options.requestedAt ?? null : options.requestedAt ?? new Date().toISOString(), requestedBy: options.actor,
    before: options.before ?? null, requested: options.legacy ? options.requested ?? null : options.requested ?? reservationSnapshot(reservation),
    processedAt: null, processedBy: null, appliedBefore: null, after: null, reason: options.reason ?? null, legacy: options.legacy ?? false });
}

export async function finishHistory(repo: ReservationRepository, before: Reservation, after: Reservation, options: { kind: HistoryKind; status: "approved" | "rejected" | "completed"; actor: HistoryActor; referenceId?: string; reason?: string; feeAcknowledgement?: import("../domain").ReservationChangeRequest["feeAcknowledgement"]; notificationReference?: ReservationSnapshot["notificationReference"] }) {
  if (!repo.createReservationHistory || !repo.listReservationHistory || !repo.completeReservationHistory) return;
  const entries = await repo.listReservationHistory(before.id);
  let entry = entries.find(row => row.kind === options.kind && row.status === "requested" && (options.referenceId ? row.referenceId === options.referenceId : true));
  if (!entry) entry = await requestHistory(repo, before, { kind: options.kind, actor: null, legacy: true, referenceId: options.referenceId, reason: options.reason, eventKey: `legacy-review:${options.kind}:${before.id}:${options.referenceId ?? before.revision ?? 0}` });
  if (entry) await repo.completeReservationHistory(entry.id, { status: options.status, processedAt: new Date().toISOString(), processedBy: options.actor, appliedBefore: reservationSnapshot(before), after: { ...reservationSnapshot(after), ...(options.notificationReference ? { notificationReference: options.notificationReference } : {}), ...(options.feeAcknowledgement ? { feeAcknowledgement: options.feeAcknowledgement } : {}) } });
}

export async function recordAdminEdit(repo: ReservationRepository, before: Reservation, after: Reservation, actor: HistoryActor, kind: "admin_edit" | "manual_status", reason?: string, notificationReference?: ReservationSnapshot["notificationReference"]) {
  if (!repo.createReservationHistory || JSON.stringify(reservationSnapshot(before)) === JSON.stringify(reservationSnapshot(after))) return;
  const at = new Date().toISOString();
  await repo.createReservationHistory({ id: randomUUID(), eventKey: `${kind}:${before.id}:${randomUUID()}`, reservationCode: before.id, kind, status: "completed", referenceId: null,
    requestedAt: at, requestedBy: actor, before: reservationSnapshot(before), requested: reservationSnapshot(after), processedAt: at, processedBy: actor, appliedBefore: reservationSnapshot(before), after: { ...reservationSnapshot(after), ...(notificationReference ? { notificationReference } : {}) }, reason: reason ?? null, legacy: false });
}
