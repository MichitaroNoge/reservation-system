"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReservationWorklist } from "./reservation-worklist";
import { isReservationReminderTarget, type ReminderKind } from "@/lib/reservation-reminders";
import { statusClass } from "../constants";
import { todayIso, reservationDisplayLabel } from "../formatters";
import type { Reservation } from "../types";

export function ReservationReminderPage({kind,reservations,loading,error,onSelect}:{kind:ReminderKind;reservations:Reservation[];loading?:boolean;error?:boolean;onSelect:(reservation:Reservation)=>void}) {
  const [search,setSearch]=useState("");
  const today=todayIso();
  const targets=reservations.filter(r=>isReservationReminderTarget(r,kind,today)).sort((a,b)=>`${a.date} ${a.startTime??""}`.localeCompare(`${b.date} ${b.startTime??""}`)||a.id.localeCompare(b.id));
  const keyword=search.trim().toLocaleLowerCase();
  const rows=targets.filter(r=>[r.id,r.customer].some(value=>value.toLocaleLowerCase().includes(keyword)));
  return <ReservationWorklist count={rows.length} search={search} onSearch={setSearch} loading={loading} error={error}>
    {loading?<p role="status" className="p-5 text-sm text-muted-foreground">対象予約を読み込み中…</p>:error?<p role="alert" className="p-5 text-sm text-destructive">予約を取得できませんでした。画面上部から再読み込みしてください。</p>:<>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-background/50 text-xs text-muted-foreground"><tr>{["利用日時","予約者・団体名","人数","連絡先","状態","操作"].map(label=><th key={label} className={`px-5 py-3 font-medium ${label==="操作"?"sticky right-0 bg-background":""}`}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-border bg-card"><td className="whitespace-nowrap px-5 py-4"><span className="block font-medium">{r.date}</span><span className="text-xs text-muted-foreground">{r.startTime??"未設定"}〜{r.endTime??"未設定"}</span></td><td className="max-w-64 break-words px-5 py-4"><span className="block font-medium">{r.customer}</span>{r.groupName&&<span className="block text-xs">{r.groupName}</span>}<span className="block text-xs text-muted-foreground">{r.id}</span></td><td className="whitespace-nowrap px-5 py-4">{r.people}名</td><td className="max-w-64 break-words px-5 py-4"><span className="block">{r.phone||"電話番号未登録"}</span><span className="block text-xs text-muted-foreground">{r.email||"メール未登録"}</span></td><td className="px-5 py-4"><span className={"badge " + statusClass[r.status]}><i />{reservationDisplayLabel(r)}</span>{kind==="menu"&&<span className="block text-xs text-warning">メニュー未確定</span>}</td><td className="sticky right-0 bg-card px-5 py-4"><Button type="button" variant="outline" className="min-h-11 whitespace-nowrap" onClick={()=>onSelect(r)}>詳細を確認</Button></td></tr>)}</tbody></table></div>
      {!rows.length&&<p className="p-8 text-center text-sm text-muted-foreground">{targets.length?"検索に一致する予約はありません。":"催促対象の予約はありません。"}</p>}
    </>}
  </ReservationWorklist>;
}
