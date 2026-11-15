"use client";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

export function ReservationDetailsDialog({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="flex h-[90dvh] max-w-4xl flex-col overflow-hidden [&>header]:flex [&>header]:shrink-0 [&>header]:items-start [&>header]:justify-between [&>header]:gap-3 [&>header]:border-b [&>header]:border-border [&>header]:px-5 [&>header]:py-4 [&_dl>div]:grid [&_dl>div]:grid-cols-[100px_minmax(0,1fr)] [&_dl>div]:gap-3 [&_dl>div]:border-b [&_dl>div]:border-border [&_dl>div]:py-3 [&_dl>div]:text-sm sm:[&_dl>div]:grid-cols-[160px_minmax(0,1fr)] [&_dt]:text-muted-foreground [&_dd]:min-w-0 [&_dd]:break-words [&_header_h2]:text-lg [&_header_h2]:font-semibold">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">予約の詳細を確認し、必要な情報を編集できます。</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>;
}
