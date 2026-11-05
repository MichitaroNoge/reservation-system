"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerSession } from "@/app/reservations/hooks/use-customer-session";
import { requestJson } from "@/app/reservations/api-client";
import { inquiryDate, inquiryStatuses, type InquiryDetail, type InquiryList } from "@/lib/inquiries/types";
import { ContactShell, InquiryContent } from "./shared";
import { CustomerPageActions } from "@/components/ui/customer-page-layout";
import { parseCustomerListPosition } from "@/lib/customer-list-position";
export function ContactHistory({ number }: { number?: string }) {
  const router = useRouter();
  const { customerUser: user, customerAuthLoading } = useCustomerSession(); const [data, setData] = useState<InquiryList | null>(null), [detail, setDetail] = useState<InquiryDetail | null>(null), [page, setPage] = useState(1), [reload, setReload] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [restoredUser, setRestoredUser] = useState<string | null>(null), scrollToRestore = useRef<number | null>(null);
  const positionKey = user ? `customer-inquiry-position:${user.uid}` : "";
  useEffect(() => {
    if (!user || number) return;
    let saved = null; try { saved = sessionStorage.getItem(positionKey); } catch { /* Storage can be unavailable. */ }
    const position = parseCustomerListPosition(saved); setPage(position.page); scrollToRestore.current = position.scroll; setRestoredUser(user.uid);
  }, [user, number, positionKey]);
  const remember = () => { if (user) try { sessionStorage.setItem(positionKey, JSON.stringify({ page, scroll: window.scrollY })); } catch { /* Navigation remains available without storage. */ } };
  useEffect(() => { if (customerAuthLoading || (user && !number && restoredUser !== user.uid)) return; setData(null); setDetail(null); if (!user) { setLoading(false); return; } let cancelled = false; setLoading(true); setError(""); void (async () => { try { const result = await requestJson<InquiryList & InquiryDetail>(number ? `/api/accounts/me/inquiries/${encodeURIComponent(number)}` : `/api/accounts/me/inquiries?page=${page}`, { authToken: await user.getIdToken() }); if (!cancelled) { if (number) setDetail(result); else setData(result); } } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "取得できませんでした。"); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [user, customerAuthLoading, page, number, reload, restoredUser]);
  useEffect(() => {
    if (!data || loading || scrollToRestore.current === null) return;
    const frame = requestAnimationFrame(() => { window.scrollTo({ top: scrollToRestore.current ?? 0, behavior: "instant" }); scrollToRestore.current = null; });
    return () => cancelAnimationFrame(frame);
  }, [data, loading]);
  return <ContactShell title={number ? "問い合わせ詳細" : "問い合わせ履歴"} wide={!number}>{loading ? <p role="status">読み込み中…</p> : !user ? <div className="space-y-4">
    <p>問い合わせ履歴を確認するにはログインしてください。</p>
    <Button asChild>
      <Link href="/login">ログイン</Link>
    </Button>
  </div> : error ? <div className="space-y-3">
    <p role="alert" className="text-sm text-destructive">{error}</p>
    <Button variant="outline" onClick={() => setReload(v => v + 1)}>再読み込み</Button>
  </div> : detail ? <div className="space-y-5">
    <InquiryContent detail={detail} />
  </div> : data ? <>
    <ListPanel aria-label="問い合わせ履歴一覧"><ListToolbar><ResultCount count={data.total} /></ListToolbar><div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>{["問い合わせ番号・受付日時", "件名", "予約番号", "対応状況"].map(v =>
            <th key={v} className="p-4 font-medium">{v}</th>)}</tr>
        </thead>
        <tbody>{data.inquiries.map(i =>
          <tr key={i.number} className="cursor-pointer border-t border-border hover:bg-accent/40" onClick={event=>{if(!(event.target as HTMLElement).closest("a")&&!window.getSelection()?.toString()){remember();router.push(`/contact/history/${encodeURIComponent(i.number)}`);}}}>
            <td className="p-4">
              <Link className="text-primary underline" onClick={remember} href={`/contact/history/${i.number}`}>{i.number}</Link>
              <span className="mt-1 block text-xs text-muted-foreground">{inquiryDate(i.createdAt)}</span>
            </td>
            <td className="max-w-64 break-words p-4">{i.subject}</td>
            <td className="p-4">{i.reservationNumber ?? "—"}</td>
            <td className="p-4"><Badge variant={i.status === "unhandled" ? "warning" : "success"}>{inquiryStatuses[i.status]}</Badge></td>
          </tr>)}</tbody>
      </table>{!data.inquiries.length && <p className="p-8 text-center text-sm text-muted-foreground">問い合わせはありません。</p>}</div>
    <ListPagination page={page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} /></ListPanel>
  </> : null}<CustomerPageActions wide={!number} backLabel={number ? "問い合わせ履歴へ戻る" : "お手続きトップへ戻る"} backHref={number ? "/contact/history" : "/?customerMode=home"} /></ContactShell>;
}
