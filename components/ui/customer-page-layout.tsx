"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { cn } from "@/lib/utils";

export function CustomerPageFrame({ children, wide = false, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <section className={cn("customer-page-frame relative mx-auto my-6 w-[calc(100%-2rem)] rounded-lg border border-border bg-card text-sm text-foreground sm:my-8", wide ? "max-w-[960px]" : "max-w-[720px]", className)}>{children}</section>;
}

export function CustomerPageActions({ children, onBack, backHref, backLabel = "お手続きトップへ戻る", busy = false, dirty = false, wide = false }: {
  children?: ReactNode;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
  busy?: boolean;
  dirty?: boolean;
  wide?: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false), [height, setHeight] = useState(96), [confirm, setConfirm] = useState(false);
  const footer = useRef<HTMLElement | null>(null), back = useRef<HTMLButtonElement | null>(null);
  const leaving = useRef(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !footer.current) return;
    const measure = () => setHeight(footer.current?.getBoundingClientRect().height ?? 96);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(footer.current);
    return () => observer.disconnect();
  }, [mounted]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { if (!leaving.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const leave = () => { if (busy) return; leaving.current = true; if (onBack) onBack(); else router.push(backHref ?? "/?customerMode=home"); };
  return <>
    <div aria-hidden="true" style={{ height }} />
    {mounted && createPortal(<footer ref={footer} aria-label="画面の操作" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <div className={cn("mx-auto flex w-[calc(100%-2rem)] flex-wrap items-center justify-end gap-3 px-4 sm:px-6 [&>button]:min-h-11 [&>button]:max-w-full [&>a]:min-h-11", wide ? "max-w-[960px]" : "max-w-[720px]")}>
        <Button ref={back} type="button" variant="outline" disabled={busy} onClick={() => { if (dirty) setConfirm(true); else leave(); }}>{backLabel}</Button>
        {children}
      </div>
    </footer>, document.body)}
    <Dialog open={confirm} onOpenChange={value => { if (!busy) setConfirm(value); }}>
      <DialogContent className="max-w-lg p-5 sm:p-6" onCloseAutoFocus={event => { event.preventDefault(); back.current?.focus(); }}>
        <DialogTitle>入力を破棄して戻りますか？</DialogTitle>
        <DialogDescription>保存・送信していない入力内容は失われます。</DialogDescription>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(false)}>入力を続ける</Button>
          <Button type="button" disabled={busy} onClick={() => { setConfirm(false); leave(); }}>破棄して戻る</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
