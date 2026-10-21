"use client";
import { Button } from "@/components/ui/button";
import { ReservationDetailsDialog } from "@/components/ui/reservation-details-dialog";
import { policyConsentDetail } from "@/lib/cancellation-policy-consent";
import { paymentConditionLabel, type ReservationChangeRequest } from "@/lib/domain";
import type { Reservation } from "../types";
import { Icon } from "./common";
import { assignmentLabel, dateTimeMinuteLabel, reservationBookingTypeLabel, reservationDateTimeLabel, reservationDisplayLabel } from "../formatters";

export function ReservationChangeReviewDialog({ request, reservation: r, onClose }: {
  request: ReservationChangeRequest;
  reservation?: Reservation;
  onClose: () => void;
}) {
  const menuLabel = (items: string[]) => items.length ? items.join("、") : "メニュー未選択";
  const rows = [
    { label: "利用日", before: request.currentDate.replaceAll("-", "/"), after: request.requestedDate.replaceAll("-", "/"), changed: request.currentDate !== request.requestedDate },
    { label: "開始時間", before: request.currentStartTime, after: request.requestedStartTime, changed: request.currentStartTime !== request.requestedStartTime },
    { label: "予定人数", before: `${request.currentPeople}名`, after: `${request.requestedPeople}名`, changed: request.currentPeople !== request.requestedPeople },
    { label: "メニュー", before: menuLabel(request.currentMenuItems), after: menuLabel(request.requestedMenuItems), changed: JSON.stringify([...request.currentMenuItems].sort()) !== JSON.stringify([...request.requestedMenuItems].sort()) },
  ];
  const details = r ? [
    ["予約区分", reservationBookingTypeLabel(r)], ["お客様 / 会社・支店名", r.customer],
    ["電話番号", r.phone], ["メールアドレス", r.email], ["住所", r.address],
    ["現在の利用日時", reservationDateTimeLabel(r)], ["支払条件", paymentConditionLabel(r.paymentCondition)],
    ["担当店舗", assignmentLabel(r) || "未割当"], ["確認連絡", r.confirmationContactedAt ? "連絡済み" : "未連絡"],
    ...(r.bookingType === "travel_agency_group" ? [
      ["予約担当者名", r.bookingContactName], ["当日責任者名", r.dayContactName], ["当日責任者携帯番号", r.dayContactPhone],
      ["団体名", r.groupName], ["団体ふりがな", r.groupNameKana], ["団体種別", r.groupType === "その他" ? r.groupTypeOther || r.groupType : r.groupType],
      ["T/C", `${r.tcCount ?? 0}名`], ["D/G", `${r.dgCount ?? 0}名`],
    ] : []), ["備考", r.remarks],
    ...(r.policyConsents ?? []).map((consent, index) => [`キャンセルポリシー同意記録 ${index + 1}`, policyConsentDetail(consent)]),
  ] : [["お客様名", request.customer], ["電話番号", request.phone], ["メールアドレス", request.email]];
  return (
    <ReservationDetailsDialog title="予約変更内容の確認" onClose={onClose}>
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div><p className="text-sm text-muted-foreground">予約変更内容の確認 · 閲覧のみ</p><h2 className="text-xl font-semibold">{request.reservationId}</h2>{r && <p className="mt-1 text-sm">{reservationDisplayLabel(r)}</p>}</div>
          <Button id="change-review-close" type="button" variant="ghost" size="icon" aria-label="閉じる" onClick={onClose}><Icon name="close" /></Button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          <section aria-labelledby="change-review-heading">
            <h3 id="change-review-heading" className="font-semibold">変更前・変更後 <span className="text-sm text-primary">{rows.filter((row) => row.changed).length}項目の変更</span></h3>
            <p className="mt-1 text-sm text-muted-foreground">申請日時：{dateTimeMinuteLabel(request.requestedAt)}</p>
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[420px] table-fixed text-left text-sm">
                <thead className="bg-muted"><tr><th className="w-24 p-3">項目</th><th className="p-3">変更前</th><th className="p-3">変更後（希望）</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.label} className={row.changed ? "border-t border-border bg-accent/40" : "border-t border-border"}><th className="p-3 align-top font-medium">{row.label}<span className={row.changed ? "mt-1 block text-xs text-primary" : "mt-1 block text-xs text-muted-foreground"}>{row.changed ? "変更あり" : "変更なし"}</span></th><td className="break-words p-3 align-top">{row.before}</td><td className={"break-words p-3 align-top " + (row.changed ? "font-semibold text-primary" : "")}>{row.after}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4"><h4 className="text-sm font-medium">変更理由</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.reason || "記載なし"}</p></div>
          </section>
          <section className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">予約の基本情報（現在）</h3>
            {!r && <p role="status" className="mt-2 text-sm text-muted-foreground">予約の基本情報を取得できません。申請時の顧客情報を表示しています。</p>}
            <dl className="mt-3">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-border py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words">{value || "-"}</dd></div>)}</dl>
          </section>
        </div>
    </ReservationDetailsDialog>
  );
}
