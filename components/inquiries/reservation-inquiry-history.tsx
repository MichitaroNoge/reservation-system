"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageSquare, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { requestJson } from "@/app/reservations/api-client";
import { inquiryDate, inquiryStatuses, type InquiryDetail, type InquiryList } from "@/lib/inquiries/types";
import { InquiryConversation } from "./inquiry-conversation";

type Props = { reservationNumber: string; audience: "customer" | "admin"; getToken: () => Promise<string> };
export function ReservationInquiryHistoryButton(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}><MessageSquare className="size-4" />問い合わせ・回答履歴</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><DialogTitle className="text-lg font-semibold">予約の問い合わせ・回答履歴</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">{props.reservationNumber} に紐づく問い合わせと回答を確認できます。</DialogDescription></div>
          <Button type="button" variant="ghost" size="icon" aria-label="問い合わせ履歴を閉じる" onClick={() => setOpen(false)}><X className="size-5" /></Button>
        </div>
        {open && <ReservationInquiryHistory key={`${props.audience}:${props.reservationNumber}`} {...props} />}
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          {props.audience === "customer" && <Button asChild variant="outline" className="min-h-11"><Link href={`/contact?reservation=${encodeURIComponent(props.reservationNumber)}`}>この予約について問い合わせる</Link></Button>}
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>閉じる</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

export function ReservationInquiryHistory({ reservationNumber, audience, getToken }: Props) {
  const [data, setData] = useState<InquiryList | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = useRef(getToken); auth.current = getToken;
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    void (async () => {
      try {
        const path = audience === "admin" ? `/api/admin/reservations/${encodeURIComponent(reservationNumber)}/inquiries` : `/api/reservations/${encodeURIComponent(reservationNumber)}/inquiries/history`;
        const result = await requestJson<InquiryList>(`${path}?page=${page}`, { authToken: await auth.current(), cache: "no-store", signal: controller.signal });
        if (!cancelled) { setData(result); setSelected(previous => result.inquiries.some(item => item.number === previous) ? previous : result.inquiries[0]?.number ?? null); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "履歴を取得できませんでした。"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [reservationNumber, audience, page, reload]);
  return <div className="space-y-4 text-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground" aria-live="polite">{loading ? "履歴を読み込み中…" : error ? "履歴を取得できませんでした。" : `問い合わせ ${data?.total ?? 0}件`}</p>
      <Button type="button" variant="ghost" size="icon" aria-label="やり取りの履歴を再読み込み" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
    </div>
    {error ? <p role="alert" className="text-destructive">{error}</p> : loading ? <p role="status">問い合わせを読み込んでいます。</p> : !data?.inquiries.length ? <p className="py-5 text-center text-muted-foreground">この予約についての問い合わせはまだありません。</p> : <>
      <div className="divide-y divide-border border-y border-border">
        {data.inquiries.map(item => <section key={item.number}>
          <button type="button" aria-expanded={selected === item.number} className="flex min-h-14 w-full items-start justify-between gap-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelected(previous => previous === item.number ? null : item.number)}>
            <span className="min-w-0"><span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{item.number}</span><span>{inquiryDate(item.createdAt)}</span><span>{inquiryStatuses[item.status]}</span></span><span className={selected === item.number ? "sr-only" : "mt-1 block break-words font-semibold"}>{item.subject}</span></span>
            <ChevronDown aria-hidden className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${selected === item.number ? "rotate-180" : ""}`} />
          </button>
          {selected === item.number && <div className="pb-5"><InquiryThread key={`${item.number}:${reload}`} number={item.number} audience={audience} getToken={() => auth.current()} /></div>}
        </section>)}
      </div>
      {data.total > data.pageSize && <div className="flex items-center justify-end gap-3"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>前へ</Button><span>{page} / {Math.ceil(data.total / data.pageSize)}</span><Button type="button" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>次へ</Button></div>}
    </>}
  </div>;
}
function InquiryThread({ number, audience, getToken }: Omit<Props, "reservationNumber"> & { number: string }) {
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const auth = useRef(getToken); auth.current = getToken;
  useEffect(() => {
    let cancelled = false; const controller = new AbortController();
    setDetail(null); setError("");
    void (async () => {
      try {
        const path = audience === "admin" ? "/api/admin/inquiries/" : "/api/accounts/me/inquiries/";
        const result = await requestJson<InquiryDetail>(`${path}${encodeURIComponent(number)}`, { authToken: await auth.current(), cache: "no-store", signal: controller.signal });
        if (!cancelled) setDetail(result);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "やり取りを取得できませんでした。"); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [number, audience, reload]);
  if (error) return <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>やり取りを再読み込み</Button></div>;
  if (!detail) return <p role="status" className="text-muted-foreground">やり取りを読み込み中…</p>;
  return <InquiryConversation detail={detail} admin={audience === "admin"} />;
}
