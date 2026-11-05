"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requestJson } from "@/app/reservations/api-client";
import type { Menu, SystemSettings } from "@/lib/domain";
import { addCalendarDays, calendarCapacityWarning, calendarDay, calendarLanes } from "@/lib/reservation-calendar";
import type { AvailabilityReservation } from "@/lib/reservation-availability";
import { inquiryAvailabilitySchema, type InquiryAvailability } from "@/lib/inquiries/availability";

const dateSchema = inquiryAvailabilitySchema.shape.mealDate;
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const kindLabel = { booked: "本予約", temporary: "仮予約", pending: "承認待ち" };
const tones = { booked: "border-primary/40 bg-primary/10", temporary: "border-warning/50 bg-warning/15", pending: "border-dashed border-muted-foreground/50 bg-muted" };
type Snapshot = { date: string; reservations: AvailabilityReservation[]; menus: Pick<Menu, "name" | "duration">[]; settings: SystemSettings; updatedAt: string };

export function InquiryAvailabilityCalendar({ availability, getAdminToken }: { availability: InquiryAvailability; getAdminToken: () => Promise<string> }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="outline" className="mt-3 min-h-11"><CalendarDays className="size-4" />予約状況を確認</Button></DialogTrigger>
    {open && <CalendarDialog availability={availability} getAdminToken={getAdminToken} onClose={() => setOpen(false)} />}
  </Dialog>;
}
function CalendarDialog({ availability, getAdminToken, onClose }: { availability: InquiryAvailability; getAdminToken: () => Promise<string>; onClose: () => void }) {
  const [date, setDate] = useState(availability.mealDate), [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const validDate = dateSchema.safeParse(date).success;
  useEffect(() => {
    if (!validDate) { setLoading(false); return; }
    const controller = new AbortController(); let inFlight = false;
    const refresh = async () => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true; setLoading(true); setError("");
      try {
        const authToken = await token.current();
        if (controller.signal.aborted) return;
        const [calendar, menus] = await Promise.all([
          requestJson<{ reservations: AvailabilityReservation[]; settings: SystemSettings }>(`/api/admin/calendar?from=${date}&to=${date}`, { authToken, signal: controller.signal, cache: "no-store" }),
          requestJson<{ menus: Menu[] }>("/api/menus", { signal: controller.signal, cache: "no-store" }),
        ]);
        if (!controller.signal.aborted) setData({ date, ...calendar, menus: menus.menus, updatedAt: new Date().toISOString() });
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "予約状況を取得できませんでした。"); }
      finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    };
    const revalidate = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const interval = window.setInterval(revalidate, 60000);
    window.addEventListener("focus", revalidate); document.addEventListener("visibilitychange", revalidate);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", revalidate); };
  }, [date, validDate, reload]);
  const current = validDate && data?.date === date ? data : null;
  const day = useMemo(() => current ? calendarDay(current.date, current.reservations, current.menus, current.settings) : null, [current]);
  const layout = useMemo(() => day ? calendarLanes(day.entries, 60) : null, [day]);
  const desiredMinute = Number(availability.mealStartTime.slice(0, 2)) * 60 + Number(availability.mealStartTime.slice(3));
  const isRequestedDay = date === availability.mealDate;
  const startHour = Math.max(0, Math.min(8, ...(day?.entries.map(e => Math.floor(e.start / 60)) ?? []), ...(day?.blocks.map(b => Math.floor(b.startMinute / 60)) ?? []), isRequestedDay ? Math.floor(desiredMinute / 60) : 8));
  const endHour = Math.min(24, Math.max(20, ...(day?.entries.map(e => Math.ceil(e.end / 60)) ?? []), ...(day?.blocks.map(b => Math.ceil(b.endMinute / 60)) ?? []), isRequestedDay ? Math.ceil((desiredMinute + 1) / 60) : 20));
  const scale = 1.6, height = (endHour - startHour) * 60 * scale + 96;
  const timeline = useRef<HTMLDivElement>(null), positionedDate = useRef("");
  useEffect(() => {
    if (!day || !timeline.current || positionedDate.current === day.date) return;
    const focus = isRequestedDay ? desiredMinute : day.entries[0]?.start ?? 8 * 60;
    timeline.current.scrollTop = Math.max(0, (focus - startHour * 60 - 60) * 1.6);
    positionedDate.current = day.date;
  }, [day, desiredMinute, startHour, isRequestedDay]);
  const shift = (amount: number) => { if (validDate) { const next = addCalendarDays(date, amount); if (dateSchema.safeParse(next).success) setDate(next); } };
  const warning = day ? calendarCapacityWarning(day) : null;
  return <DialogContent className="flex max-w-5xl flex-col overflow-hidden p-0">
    <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><div className="min-w-0"><DialogTitle className="text-lg font-semibold">予約状況を確認</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">お問い合わせ：{availability.mealDate.replaceAll("-", "/")} {availability.mealStartTime} ／ {availability.people}名</DialogDescription></div><Button type="button" variant="ghost" size="icon" aria-label="カレンダーを閉じる" onClick={onClose}><X className="size-5" /></Button></header>
    <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-2"><div className="grid gap-1"><Label htmlFor="inquiry-calendar-date">表示日（日本時間）</Label><Input id="inquiry-calendar-date" type="date" min="0001-01-01" max="9999-12-31" className="min-h-11" value={date} onChange={event => setDate(event.target.value)} aria-invalid={!validDate} aria-describedby={!validDate ? "inquiry-calendar-date-error" : undefined} /></div><Button type="button" variant="outline" className="min-h-11" aria-label="前日の予約を表示" disabled={!validDate || date === "0001-01-01"} onClick={() => shift(-1)}><ChevronLeft className="size-4" /><span className="hidden sm:inline">前日</span></Button><Button type="button" variant="outline" className="min-h-11" aria-label="翌日の予約を表示" disabled={!validDate || date === "9999-12-31"} onClick={() => shift(1)}><span className="hidden sm:inline">翌日</span><ChevronRight className="size-4" /></Button><Button type="button" variant="outline" className="min-h-11" disabled={isRequestedDay} onClick={() => setDate(availability.mealDate)}>希望日へ戻る</Button><Button type="button" variant="ghost" size="icon" className="ml-auto min-h-11" aria-label="予約状況を再読み込み" disabled={!validDate || loading} onClick={() => setReload(v => v + 1)}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /></Button></div>
      {!validDate && <p id="inquiry-calendar-date-error" role="alert" className="text-sm text-destructive">表示する日付を入力してください。</p>}
      <p className="text-xs text-muted-foreground">終了時間は未指定です。予約状況を確認して受入可否をご判断ください。</p>
      {error && <div role="alert" className="space-y-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive"><p>{error}</p><p>最新情報を取得できませんでした。{current ? "表示中の情報は前回取得した内容です。" : "再読み込みしてください。"}</p><Button type="button" variant="outline" disabled={loading} onClick={() => setReload(v => v + 1)}>再読み込み</Button></div>}
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />最新の予約状況を取得しています…</p>}
      {day && current && layout && <>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><strong>合計上限 {day.capacity === null ? "未設定" : `${day.capacity}名`}</strong><span>本予約 最大{day.peak}名</span><span>仮予約込み 最大{day.combinedPeak}名</span></div>
        <p className="text-xs text-muted-foreground">既存予約の最大同時利用人数です。お問い合わせの{availability.people}名は含みません。</p>
        {warning && <p role="alert" className="text-sm font-semibold text-destructive">{warning}</p>}
        {day.uncertain && <p role="alert" className="text-sm text-warning">利用時間が未設定の予約があります。時間要確認の予約を確認してください。</p>}
        {day.blocks.length > 0 && <ul aria-label="受入不可の時間帯" className="space-y-1 text-sm text-destructive">{day.blocks.map((block, index) => <li key={index}>受入不可：{clock(block.startMinute)}〜{clock(block.endMinute)}{block.reason ? ` ／ ${block.reason}` : ""}</li>)}</ul>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">{(["booked", "temporary", "pending"] as const).map(kind => <span key={kind} className="inline-flex items-center gap-1"><i aria-hidden className={`size-3 rounded-sm border ${tones[kind]}`} />{kindLabel[kind]}</span>)}<span className="inline-flex items-center gap-1"><i aria-hidden className="size-3 rounded-sm border border-destructive/40 bg-destructive/10" />受入不可</span>{isRequestedDay && <span className="inline-flex items-center gap-1"><i aria-hidden className="w-4 border-t-2 border-dashed border-success" />希望開始 {availability.mealStartTime}</span>}</div>
        {!day.entries.length && <p className="text-sm text-muted-foreground">この日の予約はありません。</p>}
        <div ref={timeline} role="region" aria-label={`${date}の予約カレンダー`} tabIndex={0} className="max-h-[40dvh] overflow-auto rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="grid" style={{ minWidth: Math.max(430, layout.lanes * 180 + 56), gridTemplateColumns: "56px 1fr" }}>
            <div className="sticky left-0 z-30 bg-card" style={{ height }}>{Array.from({ length: endHour - startHour + 1 }, (_, index) => <span key={index} className="absolute left-1 text-xs text-muted-foreground" style={{ top: index * 60 * scale }}>{clock((startHour + index) * 60)}</span>)}</div>
            <div role="list" aria-label="当日の予約" className="relative border-l border-border" style={{ height }}>
              {Array.from({ length: endHour - startHour + 1 }, (_, index) => <div key={index} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: index * 60 * scale }} />)}
              {day.blocks.map((block, index) => <div key={index} aria-hidden className="absolute inset-x-0 bg-destructive/10" style={{ top: (block.startMinute - startHour * 60) * scale, height: (block.endMinute - block.startMinute) * scale }} />)}
              {layout.items.map(entry => <div key={entry.reservation.id} role="listitem" className={`absolute z-10 overflow-auto rounded-md border p-2 text-xs ${tones[entry.kind]}`} style={{ top: (entry.start - startHour * 60) * scale, height: Math.max(90, (entry.end - entry.start) * scale), left: `calc(${entry.lane / entry.lanes * 100}% + 3px)`, width: `calc(${100 / entry.lanes}% - 6px)` }}><p className="font-semibold">{entry.uncertain ? "時間要確認" : `${clock(entry.start)}〜${clock(entry.end)}`} ／ {entry.reservation.people}名</p><p className="mt-1 break-words">{entry.reservation.customer}</p><p className="mt-1">{kindLabel[entry.kind]}{entry.reservation.status === "cancellation_requested" ? "・キャンセル申請中" : ""}</p><p className="text-muted-foreground">{entry.reservation.id}{entry.uncertain ? " ／ 時間要確認" : ""}</p></div>)}
              {isRequestedDay && <div role="img" aria-label={`問い合わせ希望開始 ${availability.mealStartTime}`} className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-dashed border-success" style={{ top: (desiredMinute - startHour * 60) * scale }} />}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">最終更新 {new Date(current.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（60秒ごとに更新）</p>
      </>}
    </div>
    <footer className="flex justify-end border-t border-border px-4 py-3"><Button type="button" variant="outline" className="min-h-11" onClick={onClose}>閉じて回答に戻る</Button></footer>
  </DialogContent>;
}
