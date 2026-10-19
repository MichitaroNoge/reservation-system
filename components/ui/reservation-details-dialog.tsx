"use client";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

export function ReservationDetailsDialog({ title, busy = false, onClose, children }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="drawer left-1/2! right-auto! top-1/2! z-50! h-[90dvh]! w-[calc(100%_-_2rem)]! max-w-4xl! rounded-lg! border-border! bg-background! shadow-lg! overflow-hidden! [&_dl>div]:grid! [&_dl>div]:grid-cols-[100px_minmax(0,1fr)]! [&_dl>div]:gap-3 sm:[&_dl>div]:grid-cols-[160px_minmax(0,1fr)]! [&_dl>div]:text-sm! [&_dd]:min-w-0 [&_dd]:break-words">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">予約の詳細を確認し、必要な情報を編集できます。</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>;
}
