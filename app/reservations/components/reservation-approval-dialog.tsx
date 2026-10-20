"use client";
import { ReservationInquiryHistoryButton } from "@/components/inquiries/reservation-inquiry-history";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { approvalDecision, reservationApplicationDetails, type AvailabilityResponse } from "@/lib/reservation-availability";
import type { Reservation, Status } from "../types";
import { requestJson } from "../api-client";

type Props = { reservation: Reservation; getAdminToken: () => Promise<string>; onClose: () => void; onDecision: (id: string, status: Status) => Promise<boolean> };
export function ReservationApprovalDialog({ reservation, getAdminToken, onClose, onDecision }: Props) {
  const auth = useRef(getAdminToken); auth.current = getAdminToken;
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState<"approve" | "reject" | null>(null);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(""); setData(null); setConfirmation(null);
    void (async () => {
      const result = await requestJson<AvailabilityResponse>(`/api/reservations/${encodeURIComponent(reservation.id)}/availability`, { authToken: await auth.current(), cache: "no-store" });
      if (!cancelled) setData(result);
    })().catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : "受入状況を取得できませんでした。"); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reservation.id, reload]);
  const current = data?.reservation ?? { ...reservation, menuItems: reservation.menuItems ?? [], totalAmount: reservation.totalAmount ?? 0 };
  const availability = data?.availability;
  const requestedPeople = availability?.current ?? current.people;
  const decision = approvalDecision(current.status, current.requestType);
  const blocked = Boolean(availability?.blockedPeriods.length);
  const remaining = availability?.remaining;
  const over = remaining != null && remaining < 0;
  const tentativeOver = availability?.capacity != null && availability.combined > availability.capacity;
  const incomplete = !availability || availability.capacity === null || availability.uncertain;
  const maximum = availability ? Math.max(availability.capacity ?? 0, availability.combined, 1) * 1.15 : 1;
  const disabled = busy || loading || !data || !decision || Boolean(error);
  const apply = async (action: "approve" | "reject") => {
    if (!decision || disabled) return;
    setBusy(true); setError("");
    try {
      const latest = await requestJson<AvailabilityResponse>(`/api/reservations/${encodeURIComponent(current.id)}/availability`, { authToken: await auth.current(), cache: "no-store" });
      if (JSON.stringify(latest) !== JSON.stringify(data)) { setData(latest); setConfirmation(null); setError("予約内容または受入状況が更新されました。再読み込みして内容を確認してください。"); return; }
      if (action === "approve" && latest.availability.blockedPeriods.length) { setConfirmation(null); setError("受入不可の日時と重なるため承認できません。"); return; }
      if (await onDecision(current.id, decision[action])) onClose(); else setError("保存できませんでした。受入状況を再読み込みしてからお試しください。");
    }
    catch (error) { setError(error instanceof Error ? error.message : "予約の更新に失敗しました。"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent>
    <header className="border-b border-border px-5 py-4"><DialogTitle className="text-lg font-semibold">予約の受入状況</DialogTitle><DialogDescription className="sr-only">予約人数と重なる予約を確認し、承認または却下します。</DialogDescription></header>
    <div className="grid gap-5 p-5">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{current.customer}</h3><p className="mt-1 text-xs text-muted-foreground">{current.date}　{current.startTime ?? "時間未設定"}〜{current.endTime ?? "未設定"}</p></div><div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">今回の申請</p><p className="text-2xl font-semibold tabular-nums">{requestedPeople}名</p>{Boolean(current.tcCount) && <p className="text-xs text-muted-foreground">うちT/C{current.tcCount}名</p>}</div></div>
      <div><ReservationInquiryHistoryButton reservationNumber={reservation.id} audience="admin" getToken={getAdminToken} /></div>
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />受入状況を確認しています…</p>}
      {error && <Alert role="alert" className="border-destructive/40 text-destructive"><p>{error}</p><Button className="mt-3" variant="outline" disabled={busy || loading} onClick={() => setReload(n => n + 1)}>再読み込み</Button></Alert>}
      {availability && <>
        {blocked && <Alert role="alert" className="border-destructive/40 text-destructive"><p className="font-semibold">受入不可の日時と重なっています</p><ul className="mt-2 space-y-2 text-sm">{availability.blockedPeriods.map((period,index) => <li key={index} className="break-words">{period.start.replace("T", " ")}〜{period.end.replace("T", " ")}{period.reason && <span className="block">{period.reason}</span>}</li>)}</ul><p className="mt-2 text-sm">この日時の予約は承認できません。</p></Alert>}
        {!blocked && <div role="status" className={`rounded-md p-3 text-sm ${blocked || incomplete || tentativeOver || over ? "bg-warning/10" : "bg-success/10"}`}><p className="font-medium">{blocked ? "受入不可です" : availability.capacity === null ? "全体の受入上限が未設定です" : availability.uncertain ? "利用時間に未設定の予約があります" : over ? "受入上限を超えています" : tentativeOver ? "仮予約を含めると上限を超えます" : "受入人数に余裕があります"}</p><p className="mt-1 text-xs text-muted-foreground">{blocked ? "マスタ管理で設定された受入不可期間を確認してください。" : availability.capacity === null ? "マスタ管理の「その他」で全体の受入上限を設定してください。" : availability.uncertain ? "利用時間が不明な予約は長めに集計しています。予約内容を確認してください。" : over ? `${Math.abs(remaining!)}名超過・承認前に調整を確認してください。` : tentativeOver ? `本予約＋今回は上限以内 ／ 仮予約込みで${availability.combined - availability.capacity}名超過` : "仮予約を含めても上限以内"}</p></div>}
        <div><div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">{blocked ? "人数上限までの残り（参考）" : over ? "今回承認すると上限超過" : "今回承認後の残り"}</p><p className="mt-1 text-4xl font-semibold tabular-nums">{remaining == null ? "—" : Math.abs(remaining).toLocaleString()}<span className="ml-1 text-base font-normal">名</span></p></div><p className="text-right text-xs text-muted-foreground">合計上限 <strong>{availability.capacity == null ? "未設定" : `${availability.capacity.toLocaleString()}名`}</strong></p></div>
          <div className="relative mt-3 pt-7"><div className="mb-2 flex justify-between gap-3 text-xs"><span>仮予約も含めた場合</span><span className="tabular-nums">{availability.combined.toLocaleString()}名</span></div><div role="img" aria-label={`本予約${availability.bookedAtPeak}名、今回${requestedPeople}名、仮予約${availability.temporaryAtPeak}名`} className="flex h-7 overflow-hidden rounded-sm bg-muted"><span className="bg-primary" style={{ width: `${availability.bookedAtPeak / maximum * 100}%` }} /><span className="bg-success" style={{ width: `${requestedPeople / maximum * 100}%` }} /><span className="bg-warning/70" style={{ width: `${availability.temporaryAtPeak / maximum * 100}%`, backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--warning) 3px, var(--warning) 6px)" }} /></div>{availability.capacity !== null && <div aria-hidden className="pointer-events-none absolute bottom-0 top-0 border-l-2 border-dashed border-muted-foreground" style={{ left: `${availability.capacity / maximum * 100}%` }}><span className={`absolute top-0 whitespace-nowrap bg-background text-xs text-muted-foreground ${availability.capacity === 0 ? "left-2" : "right-2"}`}>上限 {availability.capacity}名</span></div>}</div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">{[["本予約", availability.bookedAtPeak, "bg-primary"], ["今回", requestedPeople, "bg-success"], ["仮予約", availability.temporaryAtPeak, "bg-warning"]].map(([label,people,color]) => <span key={label} className="inline-flex items-center gap-1.5"><i aria-hidden className={`size-2.5 rounded-sm ${color}`} />{label} {people}名</span>)}</div>
        </div>
        <section className="border-t border-border pt-4"><h3 className="text-sm font-semibold">時間が重なる予約</h3><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[300px] text-left text-xs sm:text-sm"><thead className="text-xs text-muted-foreground"><tr>{["利用時間", "予約者", "人数", "種別"].map(label => <th className="py-2 pr-3 font-normal" key={label}>{label}</th>)}</tr></thead><tbody>{availability.overlaps.map(row => <tr key={row.id} className="border-t border-border"><td className="whitespace-nowrap py-3 pr-3">{row.date !== current.date && <span className="block text-xs">{row.date}</span>}{row.startTime ?? "未設定"}〜{row.endTime ?? "未設定"}</td><td className="max-w-48 break-words py-3 pr-3">{row.customer}</td><td className="whitespace-nowrap py-3 pr-3 text-right tabular-nums">{row.people}名{row.tcCount > 0 && <span className="block text-xs text-muted-foreground">T/C {row.tcCount}名含む</span>}</td><td className="whitespace-nowrap py-3">{row.kind === "booked" ? "本予約" : row.kind === "temporary" ? "仮予約" : "承認待ち"}{row.status === "cancellation_requested" && <span className="block text-xs text-muted-foreground">キャンセル申請中</span>}</td></tr>)}</tbody></table></div>{!availability.overlaps.length && <p className="py-4 text-sm text-muted-foreground">時間が重なる予約はありません。</p>}<p className="mt-2 text-xs text-muted-foreground">ほかの承認待ち：最大{availability.pendingPeak}名</p></section>
      </>}
      <details className="group border-t border-border pt-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-primary">予約内容の詳細<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary><dl className="mt-3 divide-y divide-border">{reservationApplicationDetails(current).map(row => <div key={row.label} className="grid gap-1 py-2 text-sm sm:grid-cols-[160px_1fr] sm:gap-3"><dt className="text-xs text-muted-foreground sm:text-sm">{row.label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{row.value}</dd></div>)}</dl></details>
      {data && !decision && <Alert>この予約は処理済みです。閉じて一覧を確認してください。</Alert>}
      {confirmation && <Alert className={confirmation === "reject" ? "border-destructive/40" : "border-warning/40"}><p className="flex items-start gap-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{confirmation === "reject" ? current.requestType === "confirmed_from_temporary" ? "本予約への変更申請を却下し、仮予約に戻します。よろしいですか？" : "この予約申請を却下します。よろしいですか？" : "上限超過または未設定の項目があります。内容を確認したうえで承認しますか？"}</p></Alert>}
    </div>
    <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-background px-5 py-4 [&_button]:min-h-11">
      {confirmation ? <><Button variant={confirmation === "reject" ? "destructive" : "default"} disabled={disabled || (confirmation === "approve" && blocked)} onClick={() => void apply(confirmation)}>{busy && <LoaderCircle className="size-4 animate-spin" />}{confirmation === "reject" ? "却下する" : "承認する"}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>戻る</Button></> : <><Button variant="outline" className="text-destructive" disabled={disabled} onClick={() => setConfirmation("reject")}>却下</Button><Button disabled={disabled || blocked} onClick={() => incomplete || over || tentativeOver ? setConfirmation("approve") : void apply("approve")}>承認</Button></>}
      <Button variant="outline" disabled={busy} onClick={onClose}>閉じる</Button>
    </footer>
  </DialogContent></Dialog>;
}
