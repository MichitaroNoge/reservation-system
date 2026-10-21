"use client";
import { Button } from "@/components/ui/button";
import { reservationChangeFeeContext } from "@/lib/cancellation-policy";
import type { Reservation, ReservationChangeRequest } from "@/lib/domain";

type FeeReservation = Pick<Reservation, "id" | "status" | "people" | "initialConfirmedPeople" | "revision">;
export function ReservationFeeReconfirmation({ reservation, request, onReconfirm }: { reservation: FeeReservation; request: ReservationChangeRequest; onReconfirm: (request: ReservationChangeRequest) => void }) {
  const context = reservationChangeFeeContext(reservation, request.requestedPeople);
  const stale = request.baseRevision !== undefined && request.baseRevision !== (reservation.revision ?? 0);
  const feeNeeded = Boolean(context && request.feeAcknowledgement?.context !== context);
  if (request.reservationId !== reservation.id || request.status !== "requested" || (!stale && !feeNeeded)) return null;
  return <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
    <p className="min-w-0 flex-1 basis-48 break-words">{request.requestedDate} {request.requestedStartTime}・{request.requestedPeople}名への変更申請は、{feeNeeded ? "キャンセル料の確認が必要です。" : "元の予約内容が更新されています。現在の内容を確認して再申請してください。"}</p>
    <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => onReconfirm(request)}>{feeNeeded ? "キャンセル料を確認する" : "変更内容を再確認する"}</Button>
  </div>;
}
