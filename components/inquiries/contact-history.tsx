"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCustomerSession } from "@/app/reservations/hooks/use-customer-session";
import { requestJson } from "@/app/reservations/api-client";
import { inquiryDate, inquiryStatuses, type InquiryDetail, type InquiryList } from "@/lib/inquiries/types";
import { ContactShell, InquiryContent } from "./shared";
export function ContactHistory({ number }: { number?: string }) {
  const { customerUser: user, customerAuthLoading } = useCustomerSession(); const [data, setData] = useState<InquiryList | null>(null), [detail, setDetail] = useState<InquiryDetail | null>(null), [page, setPage] = useState(1), [reload, setReload] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { if (customerAuthLoading) return; setData(null); setDetail(null); if (!user) { setLoading(false); return; } let cancelled = false; setLoading(true); setError(""); void (async () => { try { const result = await requestJson<InquiryList & InquiryDetail>(number ? `/api/accounts/me/inquiries/${encodeURIComponent(number)}` : `/api/accounts/me/inquiries?page=${page}`, { authToken: await user.getIdToken() }); if (!cancelled) { if (number) setDetail(result); else setData(result); } } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "取得できませんでした。"); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [user, customerAuthLoading, page, number, reload]);
  return <ContactShell title={number ? "問い合わせ詳細" : "問い合わせ履歴"}>{loading ? <p role="status">読み込み中…</p> : !user ? <div className="space-y-4">
    <p>問い合わせ履歴を確認するにはログインしてください。</p>
    <Button asChild>
      <Link href="/login">ログイン</Link>
    </Button>
  </div> : error ? <div className="space-y-3">
    <p role="alert" className="text-sm text-destructive">{error}</p>
    <Button variant="outline" onClick={() => setReload(v => v + 1)}>再読み込み</Button>
  </div> : detail ? <div className="space-y-5 rounded-lg border border-border bg-card p-5">
    <InquiryContent detail={detail} />
    <Button asChild variant="outline">
      <Link href="/contact/history">履歴へ戻る</Link>
    </Button>
  </div> : data ? <>
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>{["問い合わせ番号・受付日時", "件名", "予約番号", "対応状況"].map(v =>
            <th key={v} className="p-4 font-medium">{v}</th>)}</tr>
        </thead>
        <tbody>{data.inquiries.map(i =>
          <tr key={i.number} className="border-t border-border">
            <td className="p-4">
              <Link className="text-primary underline" href={`/contact/history/${i.number}`}>{i.number}</Link>
              <span className="mt-1 block text-xs text-muted-foreground">{inquiryDate(i.createdAt)}</span>
            </td>
            <td className="max-w-64 break-words p-4">{i.subject}</td>
            <td className="p-4">{i.reservationNumber ?? "—"}</td>
            <td className="p-4">{inquiryStatuses[i.status]}</td>
          </tr>)}</tbody>
      </table>{!data.inquiries.length && <p className="p-8 text-center text-sm text-muted-foreground">問い合わせはありません。</p>}</div>
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span>全{data.total}件</span>
      <div className="flex items-center gap-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>前へ</Button>
        <span>{page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
        <Button variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(p => p + 1)}>次へ</Button>
      </div>
    </div>
  </> : null}</ContactShell>;
}
