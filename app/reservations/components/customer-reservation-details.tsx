"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { paymentConditionLabel } from "@/lib/domain";
import { policyAgreementLabel, reservationBookingTypeLabel, reservationDateTimeLabel, reservationDisplayLabel, reservationMenuLabel } from "../formatters";
import type { Reservation } from "../types";
import { PolicyConsentHistory } from "./policy-consent-history";

type DetailRow = readonly [label: string, value: string | number | undefined];

function DetailFields({ rows }: { rows: DetailRow[] }) {
  return <dl className="divide-y divide-border text-sm">
    {rows.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{value === undefined || value === "" ? "未入力" : value}</dd>
    </div>)}
  </dl>;
}

export function CustomerReservationDetails({ reservation }: { reservation: Reservation }) {
  const [open, setOpen] = useState(false);
  const group = reservation.bookingType === "travel_agency_group";
  const contactRows: DetailRow[] = [
    [group ? "会社・支店名" : "お名前", group ? reservation.companyBranchName || reservation.customer : reservation.customer],
    ["電話番号", reservation.phone],
    ["メールアドレス", reservation.email],
    ["住所", reservation.address],
  ];
  if (group || reservation.bookingContactName || reservation.contactPersonName) contactRows.push(["予約担当者名", reservation.bookingContactName || reservation.contactPersonName]);
  if (group || reservation.dayContactName || reservation.dayContactPhone) contactRows.push(["当日責任者名", reservation.dayContactName], ["当日責任者携帯番号", reservation.dayContactPhone]);
  const groupRows: DetailRow[] = [
    ["団体名", reservation.groupName],
    ["団体ふりがな", reservation.groupNameKana],
    ["団体種別", reservation.groupType],
  ];
  if (reservation.groupType === "その他" || reservation.groupTypeOther) groupRows.push(["団体種別 その他", reservation.groupTypeOther]);
  const showGroup = group || groupRows.some(([, value]) => Boolean(value));

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="outline" className="min-h-11 justify-self-start px-3" aria-label={`${reservation.id}の予約内容の詳細`}>予約内容の詳細</Button></DialogTrigger>
    <DialogContent className="flex max-w-[720px] flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0"><DialogTitle>予約内容の詳細</DialogTitle><DialogDescription className="mt-1">予約ID：{reservation.id}</DialogDescription></div>
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="予約内容の詳細を閉じる" onClick={() => setOpen(false)}><X className="size-4" aria-hidden="true" /></Button>
      </header>
      <div className="min-h-0 overflow-y-auto px-5 py-2">
        <section aria-label="ご予約内容">
          <DetailFields rows={[
            ["予約状況", reservationDisplayLabel(reservation)],
            ...(group ? [["利用者区分", reservationBookingTypeLabel(reservation)] as const] : []),
            ["利用日時", reservationDateTimeLabel(reservation)],
            ["人数", `${reservation.people}名`],
            ["メニュー", reservationMenuLabel(reservation)],
            ...(group || reservation.tcCount || reservation.dgCount ? [
              ["T/C（添乗員・通訳ガイド）", `${reservation.tcCount ?? 0}名`] as const,
              ["D/G（ドライバー・ガイド）", `${reservation.dgCount ?? 0}名`] as const,
            ] : []),
          ]} />
        </section>
        <section className="mt-4" aria-label="予約時のお客様情報"><h3 className="font-semibold">予約時のお客様情報</h3><DetailFields rows={contactRows} /></section>
        {showGroup && <section className="mt-4" aria-label="団体情報"><h3 className="font-semibold">団体情報</h3><DetailFields rows={groupRows} /></section>}
        <DetailFields rows={[["支払条件", reservation.paymentCondition ? paymentConditionLabel(reservation.paymentCondition) : undefined], ["備考", reservation.remarks]]} />
        {reservation.policyConsents?.length ? <div className="my-4"><PolicyConsentHistory consents={reservation.policyConsents} /></div> : reservation.policyAgreement ? <DetailFields rows={[["同意内容", policyAgreementLabel(reservation)]]} /> : null}
      </div>
      <footer className="flex justify-end border-t border-border p-4"><Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>閉じる</Button></footer>
    </DialogContent>
  </Dialog>;
}
