"use client";
import { useRef, useState } from "react";
import { History, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { inquiryCategories, inquiryDate, mailStatusLabels, type InquiryDetail } from "@/lib/inquiries/types";
import { InquiryConversation } from "./inquiry-conversation";
import { controlClass } from "./shared";

export function InquiryAdminSupport({ detail, busy, error, success, onRetryReceipt, onRetryReply, onResolveReply, onOpenReservation, onOpen }: {
  detail: InquiryDetail;
  busy: boolean;
  error: string;
  success: string;
  onRetryReceipt: () => Promise<void>;
  onRetryReply: (id: string) => Promise<void>;
  onResolveReply: (id: string, outcome: "sent" | "not_sent") => Promise<void>;
  onOpenReservation: () => void;
  onOpen: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false), [historyOpen, setHistoryOpen] = useState(false);
  const historyContent = useRef<HTMLDivElement | null>(null);
  const pending = detail.replies.filter(reply => !["sent", "not_sent"].includes(reply.emailStatus));
  const feedback = <>{error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}{success && <p role="status" className="mb-4 text-sm text-success">{success}</p>}</>;
  return <div className="flex flex-wrap gap-2">
    <Dialog open={infoOpen} onOpenChange={value => { if (!busy) { if (value) onOpen(); setInfoOpen(value); } }}>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm" disabled={busy}><Info aria-hidden="true" />受付情報</Button></DialogTrigger>
      <DialogContent className="p-5 sm:p-6" onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><DialogTitle>受付情報</DialogTitle><DialogDescription className="mt-1">受付日時・種別・メール配送の確認</DialogDescription></div><Button type="button" variant="ghost" size="icon" aria-label="受付情報を閉じる" disabled={busy} onClick={() => setInfoOpen(false)}><X /></Button></div>
        {feedback}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">受付日時</dt><dd>{inquiryDate(detail.inquiry.createdAt)}</dd>
          <dt className="text-muted-foreground">種別</dt><dd>{inquiryCategories[detail.inquiry.category]}</dd>
          {detail.inquiry.reservationNumber && <><dt className="text-muted-foreground">予約番号</dt><dd className="break-words">{detail.inquiry.reservationNumber}</dd></>}
          <dt className="text-muted-foreground">受付メール</dt><dd>{mailStatusLabels[detail.inquiry.receiptEmailStatus]}</dd>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {detail.inquiry.reservationNumber && <Button type="button" variant="outline" disabled={busy} onClick={() => { setInfoOpen(false); onOpenReservation(); }}>予約詳細を開く</Button>}
          {detail.inquiry.receiptEmailStatus !== "sent" && <Button type="button" variant="outline" disabled={busy} onClick={() => void onRetryReceipt()}>受付メールを再試行</Button>}
        </div>
        <div className="mt-5 flex justify-end"><Button type="button" variant="outline" disabled={busy} onClick={() => setInfoOpen(false)}>閉じる</Button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={historyOpen} onOpenChange={value => { if (!busy) { if (value) onOpen(); setHistoryOpen(value); } }}>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm" disabled={busy}><History aria-hidden="true" />回答履歴（{detail.replies.length}件）</Button></DialogTrigger>
      <DialogContent ref={historyContent} className="max-w-3xl p-5 sm:p-6" onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><DialogTitle>回答履歴</DialogTitle><DialogDescription className="mt-1">過去の回答とメール配送状況</DialogDescription></div><Button type="button" variant="ghost" size="icon" aria-label="回答履歴を閉じる" disabled={busy} onClick={() => setHistoryOpen(false)}><X /></Button></div>
        {feedback}
        {!!pending.length && <p className="mb-4 text-sm text-warning">送信未完了の回答は、保存済みの内容で再試行できます。初回から23時間または5回を超えた場合は、送信履歴を確認して結果を記録してください。</p>}
        {!detail.replies.length ? <p className="text-sm text-muted-foreground">回答履歴はまだありません。</p> : <InquiryConversation detail={detail} admin onlyReplies replyActions={reply => !["sent", "not_sent"].includes(reply.emailStatus) ? <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void onRetryReply(reply.id)}>同じ回答を再試行</Button><InquiryReplyResolution replyId={reply.id} busy={busy} onResolve={onResolveReply} restoreFocus={() => historyContent.current?.focus()} /></div> : undefined} />}
        <div className="mt-5 flex justify-end"><Button type="button" variant="outline" disabled={busy} onClick={() => setHistoryOpen(false)}>閉じる</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}

function InquiryReplyResolution({ replyId, busy, onResolve, restoreFocus }: {
  replyId: string;
  busy: boolean;
  onResolve: (id: string, outcome: "sent" | "not_sent") => Promise<void>;
  restoreFocus: () => void;
}) {
  const [open, setOpen] = useState(false), [outcome, setOutcome] = useState<"sent" | "not_sent">("not_sent"), [checked, setChecked] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null), submitting = useRef(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (value) { setChecked(false); setOutcome("not_sent"); } } }}>
    <DialogTrigger asChild><Button ref={trigger} type="button" variant="outline" disabled={busy}>送信結果を確認・記録</Button></DialogTrigger>
    <DialogContent className="p-5" onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); else restoreFocus(); }}>
      <DialogTitle>メールの送信結果を記録</DialogTitle>
      <DialogDescription>Resendの送信履歴を確認してください。この操作ではメールを再送しません。回答はお客様の履歴画面に残ります。</DialogDescription>
      <label className="mt-4 grid gap-2 text-sm">確認した結果<select className={controlClass} value={outcome} disabled={busy} onChange={event => { setOutcome(event.target.value as "sent" | "not_sent"); setChecked(false); }}><option value="not_sent">メール送信を終了し、履歴での回答を継続する</option><option value="sent">Resendで送信済みであることを確認した</option></select></label>
      <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />送信履歴を確認しました。メールを再送せず、この結果を記録します。</label>
      <div className="mt-5 flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>戻る</Button><Button type="button" disabled={busy || !checked} onClick={async () => {
        if (busy || submitting.current) return;
        submitting.current = true;
        try { await onResolve(replyId, outcome); setOpen(false); } finally { submitting.current = false; }
      }}>結果を記録</Button></div>
    </DialogContent>
  </Dialog>;
}
