"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ManagementPage, ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { ListFilter } from "@/components/ui/select";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchField } from "@/components/ui/list-search-field";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { requestJson } from "@/app/reservations/api-client";
import { inquiryCategories, inquiryStatuses, inquiryDate, inquiryReplySchema, type InquiryDetail, type InquiryList } from "@/lib/inquiries/types";
import { inquiryMessageText } from "@/lib/inquiries/availability";
import { InquiryAvailabilityCalendar } from "./inquiry-availability-calendar";
import { ReplyTemplatePicker } from "./reply-template-picker";
import { insertReplyTemplateText } from "@/lib/inquiries/reply-template-insertion";
import { InquiryReplyDraftStore } from "./reply-drafts";
import { controlClass } from "./shared";
import { InquiryAdminSupport } from "./inquiry-admin-support";

export function InquiryManagement({ getAdminToken, onOpenReservation, onChanged, draftStore }: { getAdminToken: () => Promise<string>; onOpenReservation: (number: string) => void; onChanged?: () => void; draftStore?: InquiryReplyDraftStore }) {
  const [localDrafts] = useState(() => new InquiryReplyDraftStore());
  const drafts = draftStore ?? localDrafts;
  const [status, setStatus] = useState("unhandled"), [category, setCategory] = useState(""), [keyword, setKeyword] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1), [reload, setReload] = useState(0), [data, setData] = useState<InquiryList | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [selected, setSelected] = useState<string | null>(null);
  const getTokenRef = useRef(getAdminToken); getTokenRef.current = getAdminToken;
  useEffect(() => { const timer = setTimeout(() => { setSearch(keyword); setPage(1); }, 300); return () => clearTimeout(timer); }, [keyword]);
  useEffect(() => { let cancelled = false; setLoading(true); setError(""); const params = new URLSearchParams({ page: String(page), keyword: search, ...(status ? { status } : {}), ...(category ? { category } : {}) }); void (async () => { try { const response = await requestJson<InquiryList>(`/api/admin/inquiries?${params}`, { authToken: await getTokenRef.current() }); if (!cancelled) setData(response); } catch (e) { if (!cancelled) { setData(null); setError(e instanceof Error ? e.message : "取得できませんでした。"); } } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [status, category, search, page, reload]);
  return <>
    <ManagementPage>
    <ListPanel aria-label="問い合わせ一覧">
      <ListToolbar>
        <ListSearchField aria-label="問い合わせを検索" placeholder="番号・件名・氏名・メールで検索" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <ListFilter label="状況" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">すべて</option>{Object.entries(inquiryStatuses).map(([v, label]) =>
              <option key={v} value={v}>{label}</option>)}</ListFilter>
          <ListFilter label="種別" className="sm:w-56" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">すべて</option>{Object.entries(inquiryCategories).map(([v, label]) =>
              <option key={v} value={v}>{label}</option>)}</ListFilter>
        </div>
        <ResultCount count={data?.total ?? 0} loading={loading} error={!!error} />
        <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-[42px]" aria-label="問い合わせを再読み込み" disabled={loading} onClick={() => setReload(v => v + 1)}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </ListToolbar>
      {error ? <p role="alert" className="p-5 text-sm text-destructive">{error}</p> : loading ? <p role="status" className="p-5 text-sm text-muted-foreground">問い合わせを読み込み中…</p> : <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <caption className="sr-only">問い合わせ一覧。行または問い合わせ番号を選択すると詳細を表示します。</caption>
            <thead className="bg-background/50 text-muted-foreground">
              <tr>{["問い合わせ番号 / 受付日時", "種別", "件名", "食事日時・人数", "問い合わせ者", "予約番号", "対応状況", "最終更新", "操作"].map(v =>
                <th key={v} className={`whitespace-nowrap px-5 py-3 text-xs! font-medium ${v === "操作" ? "sticky right-0 bg-background" : ""}`}>{v}</th>)}</tr>
            </thead>
            <tbody>{data?.inquiries.map(i =>
              <tr key={i.number} className="group cursor-pointer border-t border-border bg-card hover:bg-accent/40 focus-within:bg-accent/40" onClick={() => { if (!window.getSelection()?.toString()) setSelected(i.number); }}>
                <td className="whitespace-nowrap px-5 py-4">
                  <button type="button" aria-label={`問い合わせ ${i.number} を開く`} className="min-h-6 rounded-sm text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); setSelected(i.number); }}>{i.number}</button>
                  <span className="mt-1 block text-muted-foreground">{inquiryDate(i.createdAt)}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">{inquiryCategories[i.category]}</td>
                <td className="min-w-56 max-w-80 break-words px-5 py-4">{i.subject}</td>
                <td className="whitespace-nowrap px-5 py-4">{i.availability ? <>{i.availability.mealDate.replaceAll("-", "/")} {i.availability.mealStartTime}<span className="mt-1 block">{i.availability.people}名</span></> : "—"}</td>
                <td className="min-w-48 max-w-64 break-words px-5 py-4">{i.name}<span className="mt-1 block break-all text-muted-foreground">{i.email}</span>
                </td>
                <td className="px-5 py-4">{i.reservationNumber ?? "—"}</td>
                <td className="px-5 py-4">
                  <Badge variant={i.status === "unhandled" ? "warning" : "success"} className="gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-current" />{inquiryStatuses[i.status]}</Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-4">{inquiryDate(i.updatedAt)}</td>
                <td className="sticky right-0 bg-card px-5 py-4">
                  <Button type="button" variant="outline" className="min-h-11" aria-label={`${i.number} の詳細を開く`} onClick={event => { event.stopPropagation(); setSelected(i.number); }}>詳細</Button>
                </td>
              </tr>)}</tbody>
          </table>
        </div>{!data?.inquiries.length && <p className="p-8 text-center text-sm text-muted-foreground">該当する問い合わせはありません。</p>}<ListPagination page={page} pageSize={data?.pageSize ?? 20} total={data?.total ?? 0} onPageChange={setPage} />
      </>}
    </ListPanel></ManagementPage>{selected && <InquiryAdminDetail key={selected} drafts={drafts} number={selected} onChanged={onChanged} getAdminToken={() => getTokenRef.current()} onClose={() => { setSelected(null); setReload(v => v + 1); }} onOpenReservation={number => { setSelected(null); onOpenReservation(number); }} />}</>;
}
const replyFormSchema = inquiryReplySchema.pick({ subject: true, body: true });
function InquiryAdminDetail({ number, getAdminToken, onClose, onOpenReservation, onChanged, drafts }: { number: string; getAdminToken: () => Promise<string>; onClose: () => void; onOpenReservation: (number: string) => void; onChanged?: () => void; drafts: InquiryReplyDraftStore }) {
  const [detail, setDetail] = useState<InquiryDetail | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState(""), [confirm, setConfirm] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState({ error: "", success: "" });
  const [closeAction, setCloseAction] = useState<{ reservation?: string } | null>(null);
  const baseSubject = useRef("");
  const requestKey = useRef<string>(""), sending = useRef(false), tokenRef = useRef(getAdminToken); tokenRef.current = getAdminToken;
  const form = useForm<{ subject: string; body: string }>({ resolver: zodResolver(replyFormSchema), defaultValues: { subject: "", body: "" } });
  const replyBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const replyBodyPositioned = useRef(false);
  const replyBodyField = form.register("body");
  const insertTemplate = (text: string) => {
    const input = replyBodyRef.current;
    const next = insertReplyTemplateText(form.getValues("body"), text, replyBodyPositioned.current ? input?.selectionStart : undefined);
    form.setValue("body", next.body, { shouldDirty: true, shouldValidate: true });
    if (input) input.value = next.body;
    // Restore the caret after the child dialog releases its focus trap.
    return () => { if (input?.isConnected) { input.focus(); input.setSelectionRange(next.caret, next.caret); } };
  };
  const subject = form.watch("subject"), body = form.watch("body");
  const hasDraft = !loading && Boolean(detail) && (subject !== baseSubject.current || body.length > 0);
  const saveDraft = () => {
    if (hasDraft) drafts.set(number, { ...form.getValues(), requestKey: requestKey.current });
    else if (!loading && detail) drafts.delete(number);
  };
  useEffect(() => {
    if (loading || !detail) return;
    if (subject !== baseSubject.current || body.length > 0) drafts.set(number, { subject, body, requestKey: requestKey.current });
    else drafts.delete(number);
  }, [subject, body, loading, detail, drafts, number]);
  useEffect(() => {
    if (!hasDraft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDraft]);
  const leave = (reservation?: string) => reservation ? onOpenReservation(reservation) : onClose();
  const requestClose = (reservation?: string) => {
    if (busy) return;
    if (hasDraft) { saveDraft(); setCloseAction({ reservation }); }
    else leave(reservation);
  };
  const detailRef = useRef<InquiryDetail | null>(null), changedRef = useRef(onChanged), loadSequence = useRef(0), refreshInFlight = useRef(false);
  const [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState("");
  detailRef.current = detail; changedRef.current = onChanged;
  const load = useCallback(async (quiet = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    const sequence = ++loadSequence.current;
    if (!quiet) setRefreshing(true);
    try {
      const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}`, { authToken: await tokenRef.current(), cache: "no-store" });
      if (sequence !== loadSequence.current) return;
      const previous = detailRef.current;
      detailRef.current = result; setDetail(result); setRefreshError("");
      if (previous && JSON.stringify(previous) !== JSON.stringify(result)) changedRef.current?.();
      return result;
    } catch (error) { if (sequence === loadSequence.current) throw error; }
    finally { if (sequence === loadSequence.current) { refreshInFlight.current = false; setRefreshing(false); } }
  }, [number]);
  useEffect(() => () => { loadSequence.current++; }, []);
  useEffect(() => { let cancelled = false; void (async () => { try { const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}`, { authToken: await tokenRef.current() }); if (!cancelled) { setDetail(result); baseSubject.current = `Re: ${result.inquiry.subject}`.slice(0, 200); const draft = drafts.get(number); requestKey.current = draft?.requestKey ?? ""; form.reset(draft ? { subject: draft.subject, body: draft.body } : { subject: baseSubject.current, body: "" }); } } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "取得できませんでした。"); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, [number, form, drafts]);
  const mutate = async (path: string, body: unknown, method = "POST") => {
    if (sending.current) return; sending.current = true; loadSequence.current++; refreshInFlight.current = false; setRefreshing(false); setBusy(true); setError(""); setSuccess(""); setSupportFeedback({ error: "", success: "" });
    try {
      const result = await requestJson<InquiryDetail>(`/api/admin/inquiries/${number}${path}`, { method, authToken: await tokenRef.current(), headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setDetail(result); onChanged?.();
      const message = path.endsWith("/resolve") ? "送信結果の確認を記録しました。" : path.includes("replies") ? "回答を公開し、メール送信を受け付けました。" : path.includes("receipt") ? "受付メールの再送を受け付けました。" : "処理を受け付けました。";
      if (path === "/replies") {
        setSuccess(message); drafts.delete(number); requestKey.current = ""; baseSubject.current = `Re: ${result.inquiry.subject}`.slice(0, 200); form.reset({ subject: baseSubject.current, body: "" });
      } else setSupportFeedback({ error: "", success: message });
    }
    catch (e) {
      const message = e instanceof Error ? e.message : "処理できませんでした。";
      if (path === "/replies") setError(message); else setSupportFeedback({ error: message, success: "" });
      try { await load(); onChanged?.(); } catch {/* Keep the prior view and the original safe error. */ }
    }
    finally { setBusy(false); sending.current = false; setConfirm(false); }
  };
  const pending = detail?.replies.filter(r => !["sent", "not_sent"].includes(r.emailStatus)) ?? [];
  const deliveryPending = pending.length > 0 || Boolean(detail && detail.inquiry.receiptEmailStatus !== "sent");
  useEffect(() => {
    const refresh = () => {
      if (sending.current || document.visibilityState === "hidden") return;
      void load(true).catch(() => setRefreshError("最新の送信状況を取得できませんでした。再読み込みしてください。"));
    };
    const timer = deliveryPending ? setInterval(refresh, 10000) : undefined;
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { if (timer) clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [deliveryPending, load]);
  const send = form.handleSubmit(values => { if (!detail) return; requestKey.current ||= crypto.randomUUID(); saveDraft(); void mutate("/replies", { ...values, revision: detail.inquiry.revision, requestKey: requestKey.current }); });
  return <Dialog open onOpenChange={open => { if (!open) requestClose(); }}>
    <DialogContent className="flex max-w-3xl flex-col overflow-hidden p-0" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <DialogTitle className="text-lg font-semibold">問い合わせへの回答</DialogTitle>
          <DialogDescription className="sr-only">問い合わせ内容を確認して回答を作成します。</DialogDescription>
        </div>
        <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label="問い合わせ詳細を再読み込み" disabled={busy || refreshing || loading} onClick={() => void load().catch(() => setRefreshError("最新の送信状況を取得できませんでした。再読み込みしてください。"))}><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /></Button>
        <Button variant="ghost" size="icon" aria-label="閉じる" disabled={busy} onClick={() => requestClose()}>
          <X className="size-5" />
        </Button></div>
      </div>
      <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
      {refreshError && <p role="alert" className="mb-4 text-sm text-destructive">{refreshError}</p>}
      {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}{success && <p role="status" className="mb-4 text-sm text-success">{success}</p>}
      {loading ? <p role="status">読み込み中…</p> : !detail ? <Button variant="outline" onClick={() => void load().then(() => setError("")).catch(() => setError("取得できませんでした。"))}>再読み込み</Button> : <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm"><span className="font-medium text-muted-foreground">{number}</span><Badge variant={detail.inquiry.status === "unhandled" ? "warning" : "success"}>{inquiryStatuses[detail.inquiry.status]}</Badge></div>
          <InquiryAdminSupport detail={detail} busy={busy} error={supportFeedback.error} success={supportFeedback.success}
            onOpen={() => setSupportFeedback({ error: "", success: "" })}
            onRetryReceipt={() => mutate("/receipt/retry", {})}
            onRetryReply={id => mutate(`/replies/${id}/retry`, {})}
            onResolveReply={(id, outcome) => mutate(`/replies/${id}/resolve`, { outcome, revision: detail.inquiry.revision, confirmed: true })}
            onOpenReservation={() => requestClose(detail.inquiry.reservationNumber!)} />
        </div>
        <section aria-label="お問い合わせ内容" className="mb-5 border-b border-border pb-5">
          <h2 className="break-words text-sm font-semibold">{detail.inquiry.subject}</h2>
          {detail.inquiry.category === "availability" && detail.inquiry.availability && <dl aria-label="ご希望の食事日時・人数（日本時間）" className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">食事日</dt><dd className="mt-1 break-words font-medium">{detail.inquiry.availability.mealDate.replaceAll("-", "/")}</dd></div>
            <div><dt className="text-xs text-muted-foreground">開始時間</dt><dd className="mt-1 font-medium">{detail.inquiry.availability.mealStartTime}</dd></div>
            <div><dt className="text-xs text-muted-foreground">人数</dt><dd className="mt-1 font-medium">{detail.inquiry.availability.people}名</dd></div>
          </dl>}
          {!!detail.inquiry.body && <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">{detail.inquiry.category === "availability" && detail.inquiry.availability ? detail.inquiry.body : inquiryMessageText(detail.inquiry)}</p>}
          {detail.inquiry.category === "availability" && detail.inquiry.availability && <InquiryAvailabilityCalendar availability={detail.inquiry.availability} getAdminToken={() => tokenRef.current()} />}
        </section>
        {pending.length > 0 && <p role="status" className="mb-4 text-sm text-warning">送信未完了の回答があるため、新しい回答は送信できません。「回答履歴」から確認してください。</p>}
        <form id="inquiry-reply-form" aria-label="回答を作成" onSubmit={form.handleSubmit(() => setConfirm(true))} noValidate className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"><span className="font-medium">宛先</span><span className="break-words">{detail.inquiry.name}</span><span id="reply-to" className="min-w-0 break-all text-muted-foreground">{detail.inquiry.email}</span></div>
          <div>
            <Label htmlFor="reply-subject">件名 <span className="text-xs text-muted-foreground">必須</span>
            </Label>
            <Input id="reply-subject" {...form.register("subject")} maxLength={200} className="mt-2" disabled={busy || pending.length > 0} aria-invalid={!!form.formState.errors.subject} />{form.formState.errors.subject && <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.subject.message}</p>}</div>
          <div>
            <Label htmlFor="reply-body">回答本文 <span className="text-xs text-muted-foreground">必須</span>
            </Label>
            <textarea id="reply-body" {...replyBodyField} ref={input => { replyBodyField.ref(input); replyBodyRef.current = input; }} onFocus={() => { replyBodyPositioned.current = true; }} className={`${controlClass} mt-2 min-h-40`} maxLength={10000} disabled={busy || pending.length > 0} aria-invalid={!!form.formState.errors.body} />{form.formState.errors.body && <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.body.message}</p>}
            <ReplyTemplatePicker getAdminToken={() => tokenRef.current()} onInsert={insertTemplate} disabled={busy || confirm || pending.length > 0} />
          </div>
        </form>
        <Dialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}>
          <DialogContent className="p-5">
            <DialogTitle className="font-semibold">回答メールを送信しますか？</DialogTitle>
            <DialogDescription className="mt-2 break-all text-sm text-muted-foreground">{detail.inquiry.email} に以下の回答を送信します。メール送信に失敗した場合も回答は保存され、ログイン済みのお客様は履歴画面で確認できます。</DialogDescription>
            <p className="mt-4 break-words font-medium">{form.getValues("subject")}</p>
            <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm">{form.getValues("body")}</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>戻る</Button>
              <Button disabled={busy} onClick={() => void send()}>{busy ? "送信中…" : "送信する"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>}
      </div>
      {!loading && detail && <div className="flex shrink-0 justify-end gap-3 border-t border-border px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" disabled={busy} onClick={() => requestClose()}>閉じる</Button>
        <Button type="submit" form="inquiry-reply-form" disabled={busy || pending.length > 0}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}{busy ? "送信中…" : "回答を確認"}</Button>
      </div>}
      <Dialog open={closeAction !== null} onOpenChange={open => { if (!open) setCloseAction(null); }}>
        <DialogContent className="p-5 sm:p-6">
          <DialogTitle className="font-semibold">入力中の回答をどうしますか？</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">下書きを残すと、同じ問い合わせを開いたときに再開できます。画面の再読み込み・ログアウトで下書きは消えます。</DialogDescription>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" className="min-h-11" onClick={() => setCloseAction(null)}>入力に戻る</Button>
            <Button variant="destructive" className="min-h-11" onClick={() => { const target = closeAction; drafts.delete(number); setCloseAction(null); leave(target?.reservation); }}>下書きを破棄して閉じる</Button>
            <Button className="min-h-11" onClick={() => { const target = closeAction; saveDraft(); setCloseAction(null); leave(target?.reservation); }}>下書きを残して閉じる</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DialogContent>
  </Dialog>;
}
