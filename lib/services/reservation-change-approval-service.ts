import { ApiValidationError } from "../api-validation";
import { cancellationFeeNotice, reservationChangeFeeContext } from "../cancellation-policy";
import { calculateReservationEndTime, type Reservation, type ReservationChangeRequest } from "../domain";
import { reservationAvailability } from "../reservation-availability";
import type { ReservationRepository } from "../repositories/reservation-repository";

/** Run before any update, inside the reservation transaction. */
export async function assertReservationChangeApproval(repository: ReservationRepository, current: Reservation, request: ReservationChangeRequest) {
  const context = reservationChangeFeeContext(current, request.requestedPeople);
  if (context && request.feeAcknowledgement?.context !== context) {
    const notice = cancellationFeeNotice(current, request.requestedPeople)!;
    throw Object.assign(new Error(notice.message + " キャンセル料の確認記録が現在の予約内容と一致しないため承認できません。お客様に現在の予約内容を確認し、キャンセル料の案内に同意して同じ変更内容で再申請していただいてください。"), { statusCode: 409 });
  }
  if (request.baseRevision !== undefined && request.baseRevision !== (current.revision ?? 0)) throw Object.assign(new Error("この申請の後に予約内容が更新されています。古い内容で上書きしないため承認を停止しました。現在の予約内容を確認し、お客様に変更内容の再申請を依頼してください。"), { statusCode: 409 });
  const [settings, menus] = await Promise.all([repository.getSystemSettings(), repository.listMenus()]);
  const target = { ...current, date: request.requestedDate, startTime: request.requestedStartTime, people: request.requestedPeople, menuItems: request.requestedMenuItems, endTime: calculateReservationEndTime(request.requestedStartTime, request.requestedMenuItems, menus) };
  if (reservationAvailability(target, [], settings.acceptanceCapacity, menus, settings.blockedPeriods).blockedPeriods.length) {
    throw new ApiValidationError("変更後の利用時間が受入不可の日時と重なるため承認できません。");
  }
}
