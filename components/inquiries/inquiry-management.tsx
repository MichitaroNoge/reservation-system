"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Mail, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { requestJson } from "@/app/reservations/api-client";
import { inquiryCategories, inquiryStatuses, inquiryDate, inquiryReplySchema, mailStatusLabels, type InquiryDetail, type InquiryList } from "@/lib/inquiries/types";
import { controlClass, InquiryContent } from "./shared";

export function InquiryManagement({ getAdminToken, onOpenReservation }: { getAdminToken: () => Promise<string>; onOpenReservation: (number: string) => void }) {
  const [status, setStatus] = useState(""), [category, setCategory] = useState(""), [keyword, setKeyword] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1), [reload, setReload] = useState(0), [data, setData] = useState<InquiryList | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [selected, setSelected] = useState<string | null>(null);
  const getTokenRef = useRef(getAdminToken); getTokenRef.current = getAdminToken;
  useEffect(() => { const timer = setTimeout(() => { setSearch(keyword); setPage(1); }, 300); return () => clearTimeout(timer); }, [keyword]);
  useEffect(() => { let cancelled = false; setLoading(true); setError(""); const params = new URLSearchParams({ page: String(page), keyword: search, ...(status ? { status } : {}), ...(category ? { category } : {}) }); void (async () => { try { const response = await requestJson<InquiryList>(`/api/admin/inquiries?${params}`, { authToken: await getTokenRef.current() }); if (!cancelled) setData(response); } catch (e) { if (!cancelled) { setData(null); setError(e instanceof Error ? e.message : "取得できませんでした。"); } } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [status, category, search, page, reload]);
  return <>
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input aria-label="問い合わせを検索" placeholder="番号・件名・氏名・メールで検索" className="pl-9" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">状況<select className={controlClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">すべて</option>{Object.entries(inquiryStatuses).map(([v, label]) =>
              <option key={v} value={v}>{label}</option>)}</select>
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">種別<select className={controlClass} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">すべて</option>{Object.entries(inquiryCategories).map(([v, label]) =>
              <option key={v} value={v}>{label}</option>)}</select>
          </label>
        </div>
        <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">該当 <strong className="text-lg text-foreground">{loading ? "—" : data?.total ?? 0}</strong> 件</span>
        <Button variant="ghost" size="icon" aria-label="問い合わせを再読み込み" disabled={loading} onClick={() => setReload(v => v + 1)}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {error ? <p role="alert" className="p-5 text-sm text-destructive">{error}</p> : loading ? <p role="status" className="p-5 text-sm text-muted-foreground">問い合わせを読み込み中…</p> : <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>{["問い合わせ番号 / 受付日時", "種別", "件名", "問い合わせ者", "予約番号", "対応状況", "最終更新", "操作"].map(v =>
                <th key={v} className={`px-5 py-3 font-medium ${v === "操作" ? "sticky right-0 bg-background" : ""}`}>{v}</th>)}</tr>
            </thead>
            <tbody>{data?.inquiries.map(i =>
              <tr key={i.number} className="border-t border-border bg-card">
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="block font-medium">{i.number}</span>
                  <span className="mt-1 block text-muted-foreground">{inquiryDate(i.createdAt)}</span>
                </td>
                <td className="px-5 py-4">{inquiryCategories[i.category]}</td>
                <td className="max-w-64 break-words px-5 py-4">{i.subject}</td>
                <td className="max-w-64 break-words px-5 py-4">{i.name}<span className="mt-1 block break-all text-muted-foreground">{i.email}</span>
                </td>
                <td className="px-5 py-4">{i.reservationNumber ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 ${i.status === "unhandled" ? "bg-warning/10 text-warning" : i.status === "answered" ? "bg-success/10 text-success" : "bg-muted text-foreground"}`}>{inquiryStatuses[i.status]}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">{inquiryDate(i.updatedAt)}</td>
                <td className="sticky right-0 bg-card px-5 py-4">
                  <Button variant="outline" onClick={() => setSelected(i.number)}>詳細</Button>
                </td>
              </tr>)}</tbody>
          </table>
        </div>{!data?.inquiries.length && <p className="p-8 text-center text-sm text-muted-foreground">該当する問い合わせはありません。</p>}<div className="flex justify-end gap-3 border-t border-border p-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>前へ</Button>
          <span className="self-center text-sm">{page} / {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)))}</span>
          <Button variant="outline" disabled={!data || page * data.pageSize >= data.total} onClick={() => setPage(p => p + 1)}>次へ</Button>
        </div>
      </>}
    </section>{selected && <InquiryAdminDetail number={selected} getAdminToken={() => getTokenRef.current()} onClose={() => { setSelected(null); setReload(v => v + 1); }} onOpenReservation={number => { setSelected(null); onOpenReservation(number); }} />}</>;
}
const replyFormSchema = inquiryReplySchema.pick({ subject: true, body: true });
function InquiryAdminDetail({ number, getAdminToken, onClose, onOpenReservation }: { number: string; getAdminToken: () => Promise<string>; onClose: () => void; onOpenReservation: (number: string) => void }) {
  const [detail, setDetail] = useState<InquiryDetail | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState(""), [confirm, setConfirm] = useState(false);
  const requestKey = useRef<string>(""), sending = useRef(false), tokenRef = useRef(getAdminToken); tokenRef.current = getAdminToken;
  const form = useForm<{ subject: string; body: string }>({ resolver: zodResolver(replyFormSchema), defaultValues: { subject: "", body: "" } });
  const load = useCallback(async () => { const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}`, { authToken: await tokenRef.current() }); setDetail(result); return result; }, [number]);
  useEffect(() => { let cancelled = false; void (async () => { try { const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}`, { authToken: await tokenRef.current() }); if (!cancelled) { setDetail(result); form.reset({ subject: `Re: ${result.inquiry.subject}`.slice(0, 200), body: "" }); } } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "取得できませんでした。"); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [number, form]);
  const mutate = async (path: string, body: unknown, method = "POST") => {
    if (sending.current) return; sending.current = true; setBusy(true); setError(""); setSuccess("");
    try { const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}${path}`, { method, authToken: await tokenRef.current(), headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); setDetail(result); setSuccess(path.includes("replies") ? "回答メールを送信しました。" : path.includes("receipt") ? "受付メールを送信しました。" : "対応状況を変更しました。"); if (path.includes("/replies")) { requestKey.current = ""; form.reset({ subject: `Re: ${result.inquiry.subject}`.slice(0, 200), body: "" }); } }
    catch (e) { setError(e instanceof Error ? e.message : "処理できませんでした。"); try { await load(); } catch {/* Keep the prior view and the original safe error. */ } }
    finally { setBusy(false); sending.current = false; setConfirm(false); }
  };
  const pending = detail?.replies.filter(r => r.emailStatus !== "sent") ?? [];
  const send = form.handleSubmit(values => { if (!detail) return; requestKey.current ||= crypto.randomUUID(); void mutate("/replies", { ...values, revision: detail.inquiry.revision, requestKey: requestKey.current }); });
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-3xl p-5 sm:p-6" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <DialogTitle className="text-lg font-semibold">問い合わせ詳細</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">{number} の内容と回答履歴</DialogDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="閉じる" disabled={busy} onClick={onClose}>
          <X className="size-5" />
        </Button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}{success && <p role="status" className="mb-4 text-sm text-success">{success}</p>}
      {loading ? <p role="status">読み込み中…</p> : !detail ? <Button variant="outline" onClick={() => void load().then(() => setError("")).catch(() => setError("取得できませんでした。"))}>再読み込み</Button> : <>
        <InquiryContent detail={detail} admin>
          <div className="flex flex-wrap gap-2">{detail.inquiry.reservationNumber && <Button variant="outline" disabled={busy} onClick={() => onOpenReservation(detail.inquiry.reservationNumber!)}>予約詳細を開く</Button>}{detail.inquiry.receiptEmailStatus !== "sent" && <Button variant="outline" disabled={busy} onClick={() => void mutate("/receipt/retry", {})}>受付メールを再試行</Button>}</div>
        </InquiryContent>
        {pending.length > 0 && <section className="mt-5 space-y-3 rounded-md border border-warning/40 p-4">
          <h2 className="text-sm font-semibold">送信が完了していない回答</h2>
          <p className="text-xs text-muted-foreground">保存済みの内容・宛先で再試行します。送信中はしばらく待ってください。初回試行から23時間または5回を超えた場合はResendの履歴確認が必要です。</p>{pending.map(r =>
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>{mailStatusLabels[r.emailStatus]}</span>
              <Button variant="outline" disabled={busy} onClick={() => void mutate(`/replies/${r.id}/retry`, {})}>同じ回答を再試行</Button>
            </div>)}</section>}
        <div className="my-5 flex flex-wrap items-center gap-2 border-y border-border py-4">
          <span className="mr-2 text-sm">対応状況</span>
          <Button variant="outline" disabled={busy || pending.length > 0 || detail.inquiry.status === "in_progress"} onClick={() => void mutate("", { status: "in_progress", revision: detail.inquiry.revision }, "PATCH")}>対応中にする</Button>
          <Button variant="outline" disabled={busy || pending.length > 0 || detail.inquiry.status === "closed"} onClick={() => void mutate("", { status: "closed", revision: detail.inquiry.revision }, "PATCH")}>完了にする</Button>
        </div>
        <form onSubmit={form.handleSubmit(() => setConfirm(true))} noValidate className="space-y-4">
          <h2 className="font-semibold">メールで回答</h2>
          <p className="text-sm text-muted-foreground">「送信する」を押すと、メールの送信結果にかかわらず、お客様の履歴画面に回答が公開されます。</p>
          <div>
            <Label htmlFor="reply-to">宛先</Label>
            <Input id="reply-to" className="mt-2" value={detail.inquiry.email} readOnly />
          </div>
          <div>
            <Label htmlFor="reply-subject">件名 <span className="text-xs text-muted-foreground">必須</span>
            </Label>
            <Input id="reply-subject" {...form.register("subject")} maxLength={200} className="mt-2" disabled={busy || pending.length > 0 || detail.inquiry.status === "closed"} aria-invalid={!!form.formState.errors.subject} />{form.formState.errors.subject && <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.subject.message}</p>}</div>
          <div>
            <Label htmlFor="reply-body">回答本文 <span className="text-xs text-muted-foreground">必須</span>
            </Label>
            <textarea id="reply-body" {...form.register("body")} className={`${controlClass} mt-2 min-h-40`} maxLength={10000} disabled={busy || pending.length > 0 || detail.inquiry.status === "closed"} aria-invalid={!!form.formState.errors.body} />{form.formState.errors.body && <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.body.message}</p>}</div>{detail.inquiry.status === "closed" && <p className="text-sm text-muted-foreground">追加回答する場合は「対応中にする」を押してください。</p>}<div className="flex justify-end gap-3">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>閉じる</Button>
            <Button type="submit" disabled={busy || pending.length > 0 || detail.inquiry.status === "closed"}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}{busy ? "送信中…" : "回答を確認"}</Button>
          </div>
        </form>
        <Dialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}>
          <DialogContent className="p-5">
            <DialogTitle className="font-semibold">回答メールを送信しますか？</DialogTitle>
            <DialogDescription className="mt-2 break-all text-sm text-muted-foreground">{detail.inquiry.email} に以下の回答を送信します。メール送信に失敗した場合も、回答はお客様の履歴画面に公開されます。</DialogDescription>
            <p className="mt-4 break-words font-medium">{form.getValues("subject")}</p>
            <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm">{form.getValues("body")}</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>戻る</Button>
              <Button disabled={busy} onClick={() => void send()}>{busy ? "送信中…" : "送信する"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>}
    </DialogContent>
  </Dialog>;
}
