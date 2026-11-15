"use client";
import { useMemo, useState } from "react";
import { useAdminInteractions } from "@/components/ui/admin-interactions";
import { Button } from "@/components/ui/button";
import { ReservationWorklist } from "./reservation-worklist";
import { StoreAssignmentForm } from "./store-assignment-form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isConfirmedReservation, reservationAssignments } from "@/lib/domain";
import type { Reservation, Store, StoreAssignment } from "../types";

type Props = { reservations: Reservation[]; stores: Store[]; loading?: boolean; error?: boolean; onAssign: (id: string, assignments: StoreAssignment[]) => Promise<boolean> };
export function StoreAssignmentPage({ reservations, stores, loading, error, onAssign }: Props) {
  const [search,setSearch]=useState("");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const pending = useMemo(()=>reservations.filter(r=>isConfirmedReservation(r) && !reservationAssignments(r).length).sort((a,b)=>`${a.date} ${a.startTime??""}`.localeCompare(`${b.date} ${b.startTime??""}`) || a.id.localeCompare(b.id)),[reservations]);
  const rows=pending.filter(r=>[r.id,r.customer,r.groupName??""].some(value=>value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const selected=reservations.find(r=>r.id===selectedId);
  return <>
    <ReservationWorklist count={rows.length} search={search} onSearch={setSearch} loading={loading} error={error} searchLabel="予約ID・顧客名・団体名で検索">
      {saved && <p role="status" className="px-5 pt-4 text-sm text-success">店舗割当を保存しました。</p>}
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">店舗割当待ちの予約を読み込み中…</p> : error ? <p role="alert" className="p-5 text-sm text-destructive">予約または店舗を取得できませんでした。画面上部から再読み込みしてください。</p> : <>
        {!stores.length && <p role="alert" className="px-5 pt-4 text-sm text-warning">有効な店舗がありません。マスタ・設定で店舗を登録してください。</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-card/50 text-xs text-muted-foreground"><tr>{["利用日時","予約者・団体名","人数","メニュー","操作"].map(label=><th key={label} className={`px-5 py-3 font-medium ${label==="操作"?"sticky right-0 bg-card":""}`}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="cursor-pointer border-t border-border bg-card hover:bg-accent/40" onClick={()=>{if(stores.length&&!window.getSelection()?.toString()){setSelectedId(r.id);setSaved(false);}}}><td className="whitespace-nowrap px-5 py-4"><span className="block font-medium">{r.date}</span><span className="text-xs text-muted-foreground">{r.startTime??"未設定"}〜{r.endTime??"未設定"}</span></td><td className="max-w-72 break-words px-5 py-4"><span className="block font-medium">{r.customer}</span>{r.groupName && <span className="block text-xs">{r.groupName}</span>}<span className="block text-xs text-muted-foreground">{r.id}</span></td><td className="whitespace-nowrap px-5 py-4 tabular-nums">{r.people}名</td><td className="max-w-64 break-words px-5 py-4">{r.menuItems?.join("、") || r.menu || "未選択"}</td><td className="sticky right-0 bg-card px-5 py-4"><Button type="button" className="min-h-11 whitespace-nowrap" disabled={!stores.length} onClick={event=>{event.stopPropagation();setSelectedId(r.id);setSaved(false);}}>店舗を割り当てる</Button></td></tr>)}</tbody></table></div>
        {!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">{pending.length ? "検索に一致する予約はありません。" : "店舗割当待ちの予約はありません。"}</p>}
      </>}
    </ReservationWorklist>
    {selected && <StoreAssignmentDialog key={selected.id} reservation={selected} stores={stores} unavailable={Boolean(loading || error)} onClose={()=>setSelectedId(null)} onAssign={async(id,assignments)=>{const ok=await onAssign(id,assignments);if(ok){setSelectedId(null);setSaved(true);}return ok;}} />}
  </>;
}
function StoreAssignmentDialog({reservation:r,stores,onAssign,onClose,unavailable}:{reservation:Reservation;stores:Store[];onAssign:Props["onAssign"];onClose:()=>void;unavailable:boolean}) {
  const { leave } = useAdminInteractions();
  const [saving, setSaving] = useState(false);
  const processed = !isConfirmedReservation(r) || reservationAssignments(r).length > 0;
  return <Dialog open onOpenChange={open => { if (!open && !saving) leave(onClose); }}><DialogContent onInteractOutside={event => { if (saving) event.preventDefault(); }}>
    <header className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">店舗割当</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">{r.customer} ／ {r.date} {r.startTime ?? "未設定"}〜{r.endTime ?? "未設定"} ／ {r.people}名</DialogDescription></header>
    {processed && <p role="alert" className="px-5 pt-5 text-sm text-warning">この予約は店舗割当済み、または割当待ちの状態ではありません。閉じて最新の一覧を確認してください。</p>}
    <StoreAssignmentForm reservation={r} stores={stores} disabled={processed || unavailable} onClose={onClose} onSave={async assignments => {
      if (processed || unavailable) return false;
      setSaving(true);
      try { return await onAssign(r.id, assignments); } finally { setSaving(false); }
    }} />
  </DialogContent></Dialog>;
}
