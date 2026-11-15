"use client";
import { useRef, useState, type RefObject } from "react";
import { CheckCircle2, Clock3, History, RefreshCw } from "lucide-react";
import { useAdminInteractions } from "@/components/ui/admin-interactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { inquiryDate, type InquiryReply } from "@/lib/inquiries/types";
import { isReplyDeliveryComplete, replyDeliveryPresentation } from "@/lib/inquiries/reply-delivery-presentation";
import { Select } from "@/components/ui/select";

type ReplyActions = {
  busy: boolean;
  error: string;
  onRetry: (id: string) => Promise<unknown>;
  onResolve: (id: string, outcome: "sent" | "not_sent") => Promise<boolean>;
  restoreFocus: () => void;
};

export function InquiryReplyResult({ replies, busy, refreshing, error, onRetry, onResolve, onRefresh, onHistory, resultRef }: Omit<ReplyActions, "restoreFocus"> & {
  replies: InquiryReply[];
  refreshing: boolean;
  onRefresh: () => void;
  onHistory: () => void;
  resultRef: RefObject<HTMLElement | null>;
}) {
  const needsAttention = replies.some(reply => reply.emailStatus === "failed" || reply.emailStatus === "unknown");
  return <section ref={resultRef} tabIndex={-1} aria-label="保存した回答" className="space-y-5 outline-none">
    <h2 className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 aria-hidden="true" className="size-5 text-success" />保存した回答</h2>
    {replies.map(reply => {
      const presentation = replyDeliveryPresentation[reply.emailStatus];
      const waiting = reply.emailStatus === "pending" || reply.emailStatus === "sending";
      const attention = reply.emailStatus === "failed" || reply.emailStatus === "unknown";
      return <article key={reply.id} aria-label={`保存した回答：${reply.subject}`} className="space-y-3 border-b border-border pb-5">
        <div role="status" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">通知メール</span><Badge variant={presentation.variant}>{waiting && <Clock3 aria-hidden="true" className="mr-1 size-3" />}{presentation.label}</Badge></div>
          <p className={`text-sm leading-6 ${attention ? reply.emailStatus === "failed" ? "text-destructive" : "text-warning" : "text-muted-foreground"}`}>{presentation.description}</p>
        </div>
        <InquiryReplyActions reply={reply} busy={busy} error={error} onRetry={onRetry} onResolve={onResolve} restoreFocus={() => resultRef.current?.focus()} />
        <dl className="space-y-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">回答日時</dt><dd className="mt-1"><time dateTime={reply.createdAt}>{inquiryDate(reply.createdAt)}</time></dd></div>
          <div><dt className="text-xs text-muted-foreground">件名</dt><dd className="mt-1 break-words font-medium">{reply.subject}</dd></div>
          <div><dt className="text-xs text-muted-foreground">回答本文</dt><dd className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words leading-6">{reply.body}</dd></div>
        </dl>
      </article>;
    })}
    {replies.some(reply => !isReplyDeliveryComplete(reply.emailStatus)) && <p className="text-sm text-muted-foreground">{needsAttention ? "メールの再試行、または送信結果の確認・記録が完了すると、追加の回答を作成できます。" : "メールの送信完了後に、追加の回答を作成できます。"}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={busy || refreshing} onClick={onRefresh}><RefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} />{refreshing ? "更新中…" : "送信状況を更新"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={onHistory}><History aria-hidden="true" />回答履歴を見る</Button>
    </div>
  </section>;
}

export function InquiryReplyActions({ reply, busy, error, onRetry, onResolve, restoreFocus, allowPendingRecovery = false }: ReplyActions & { reply: InquiryReply; allowPendingRecovery?: boolean }) {
  const { confirm } = useAdminInteractions();
  if (isReplyDeliveryComplete(reply.emailStatus)) return null;
  if (!allowPendingRecovery && (reply.emailStatus === "pending" || reply.emailStatus === "sending")) return null;
  const retry = <Button key="retry" type="button" variant="outline" disabled={busy} onClick={() => void confirm({ title: "回答メールを再試行しますか？", description: "保存済みの同じ回答メールを再試行の対象にします。送信結果が不明な場合は、先に送信履歴を確認してください。", details: <p className="break-words text-sm">{reply.subject}</p>, confirmLabel: "同じメールを再試行する", onConfirm: async () => (await onRetry(reply.id)) === false ? false : undefined })}><RefreshCw aria-hidden="true" />同じメールを再試行</Button>;
  const resolution = <InquiryReplyResolution key="resolution" replyId={reply.id} busy={busy} error={error} onResolve={onResolve} restoreFocus={restoreFocus} />;
  return <div className="mt-3 flex flex-wrap gap-2">
    {reply.emailStatus === "unknown" ? [resolution, retry] : [retry, resolution]}
  </div>;
}

function InquiryReplyResolution({ replyId, busy, error, onResolve, restoreFocus }: Omit<ReplyActions, "onRetry"> & { replyId: string }) {
  const [open, setOpen] = useState(false), [outcome, setOutcome] = useState<"sent" | "not_sent">("not_sent"), [checked, setChecked] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null), submitting = useRef(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (value) { setChecked(false); setOutcome("not_sent"); } } }}>
    <DialogTrigger asChild><Button ref={trigger} type="button" variant="outline" disabled={busy}>送信結果を確認</Button></DialogTrigger>
    <DialogContent className="p-5" onInteractOutside={event => { if (busy) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); else restoreFocus(); }}>
      <DialogTitle>メールの送信結果を記録</DialogTitle>
      <DialogDescription className="mt-2">Resendの送信履歴を確認してください。この操作ではメールを再送しません。保存した回答は回答履歴に残ります。</DialogDescription>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <label className="mt-4 grid gap-2 text-sm">確認した結果<Select value={outcome} disabled={busy} onChange={event => { setOutcome(event.target.value as "sent" | "not_sent"); setChecked(false); }}><option value="not_sent">メール送信を終了し、履歴での回答を継続する</option><option value="sent">Resendで送信済みであることを確認した</option></Select></label>
      <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />送信履歴を確認しました。メールを再送せず、この結果を記録します。</label>
      <div className="mt-5 flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>戻る</Button><Button type="button" disabled={busy || !checked} onClick={async () => {
        if (busy || submitting.current) return;
        submitting.current = true;
        try { if (await onResolve(replyId, outcome)) setOpen(false); } finally { submitting.current = false; }
      }}>{busy ? "記録中…" : "結果を記録"}</Button></div>
    </DialogContent>
  </Dialog>;
}
