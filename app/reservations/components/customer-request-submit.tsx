"use client";
import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CancellationFeeNotice } from "@/lib/cancellation-policy";

export function CustomerRequestSubmit({ notice, cancellation = false, disabled, isSubmitting, onSubmit }: {
  notice: CancellationFeeNotice | null;
  cancellation?: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: (acknowledged: boolean) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const submitting = useRef(false);
  const label = cancellation ? "キャンセルを申請する" : "変更を申請する";
  const submit = async () => {
    if (disabled || isSubmitting || submitting.current) return;
    submitting.current = true;
    try { await onSubmit(Boolean(notice)); setOpen(false); }
    finally { submitting.current = false; }
  };
  return <div className="mt-5 grid gap-4">
    {notice && <Alert role="alert" className="border-warning/50 bg-warning/10 text-foreground"><p className="flex items-start gap-2 text-sm leading-relaxed"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{notice.message}</span></p></Alert>}
    <Button type="button" className="justify-self-end" disabled={disabled || isSubmitting} onClick={() => { if (notice || cancellation) setOpen(true); else void submit(); }}>{isSubmitting ? "送信中…" : label}</Button>
    <Dialog open={open} onOpenChange={value => { if (!isSubmitting && !submitting.current) setOpen(value); }}>
      <DialogContent className="max-w-lg p-5 sm:p-6" onEscapeKeyDown={event => { if (isSubmitting || submitting.current) event.preventDefault(); }}>
        <DialogTitle className="text-lg font-semibold">{notice ? "キャンセル料の確認" : "キャンセル申請の確認"}</DialogTitle>
        <DialogDescription className="mt-4 text-sm leading-relaxed text-foreground">{notice?.message ?? "この予約のキャンセルを申請します。よろしいですか？"}</DialogDescription>
        <p className="mt-3 text-sm text-muted-foreground">{notice ? "案内をご確認いただいたうえで、申請を続けられます。" : "申請内容は管理者が確認します。"}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setOpen(false)}>戻る</Button><Button type="button" disabled={disabled || isSubmitting} onClick={() => void submit()}>{isSubmitting ? "送信中…" : notice ? "確認して申請する" : label}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
