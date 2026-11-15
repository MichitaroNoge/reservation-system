"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import { AdminActionGate } from "@/lib/admin-interactions";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

type Confirmation = {
  title: string;
  description: ReactNode;
  details?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  acknowledgement?: string;
  onConfirm: () => void | boolean | Promise<void | boolean>;
};
type InteractionContext = {
  confirm: (options: Confirmation) => Promise<boolean>;
  leave: (action: () => void, dirty?: boolean) => void;
  register: (id: string, dirty: boolean, busy: boolean) => () => void;
};
const Context = createContext<InteractionContext | null>(null);

export function AdminInteractionProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const pending = useRef<((result: boolean) => void) | null>(null);
  const gate = useRef(new AdminActionGate());
  const forms = useRef(new Map<string, { dirty: boolean; busy: boolean }>());
  const confirm = useCallback((options: Confirmation) => {
    if (pending.current) return Promise.resolve(false);
    setError(""); setChecked(false); setConfirmation(options);
    return new Promise<boolean>(resolve => { pending.current = resolve; });
  }, []);
  const close = () => {
    if (gate.current.busy) return;
    setConfirmation(null); setError(""); pending.current?.(false); pending.current = null;
  };
  const execute = async () => {
    if (!confirmation || gate.current.busy || (confirmation.acknowledgement && !checked)) return;
    setBusy(true); setError("");
    try {
      if (!await gate.current.run(confirmation.onConfirm)) return;
      setConfirmation(null); pending.current?.(true); pending.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "処理できませんでした。もう一度お試しください。");
    } finally { setBusy(false); }
  };
  const register = useCallback((id: string, dirty: boolean, formBusy: boolean) => {
    forms.current.set(id, { dirty, busy: formBusy });
    return () => { forms.current.delete(id); };
  }, []);
  const leave = useCallback((action: () => void, dirty?: boolean) => {
    const states = [...forms.current.values()];
    if (gate.current.busy || states.some(state => state.busy)) return;
    if (!(dirty ?? states.some(state => state.dirty))) { action(); return; }
    void confirm({ title: "入力内容を破棄しますか？", description: "保存していない変更があります。破棄すると入力内容は元に戻ります。", confirmLabel: "破棄して移動する", destructive: true, onConfirm: action });
  }, [confirm]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (gate.current.busy || [...forms.current.values()].some(state => state.dirty || state.busy)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return <Context.Provider value={{ confirm, leave, register }}>{children}
    <Dialog open={!!confirmation} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <header className="border-b border-border px-5 py-4"><DialogTitle>{confirmation?.title}</DialogTitle></header>
        <div className="space-y-4 p-5"><DialogDescription asChild><div>{confirmation?.description}</div></DialogDescription>{confirmation?.details}
          {confirmation?.acknowledgement && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" disabled={busy} checked={checked} onChange={event => setChecked(event.target.checked)} />{confirmation.acknowledgement}</label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <AdminActions><Button type="button" variant="outline" disabled={busy} onClick={close}>戻る</Button><Button type="button" variant={confirmation?.destructive ? "destructive" : "default"} disabled={busy || (!!confirmation?.acknowledgement && !checked)} onClick={() => void execute()}>{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? "処理中…" : confirmation?.confirmLabel}</Button></AdminActions>
      </DialogContent>
    </Dialog>
  </Context.Provider>;
}

export function useAdminInteractions() {
  const context = useContext(Context);
  if (!context) throw new Error("AdminInteractionProvider is required.");
  return context;
}

/** Local close checks only this form; navigation checks every mounted editor. */
export function useAdminDraft(dirty: boolean, busy = false) {
  const { register, leave } = useAdminInteractions();
  const id = useId();
  useEffect(() => register(id, dirty, busy), [id, dirty, busy, register]);
  return (action: () => void) => { if (!busy) leave(action, dirty); };
}

export function AdminActions({ children }: { children: ReactNode }) {
  return <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-card px-5 py-4 [&_button]:min-h-11">{children}</footer>;
}

export function AdminFormDialog({ title, description, children, actions, onClose, dirty = false, busy = false }: { title: string; description?: string; children: ReactNode; actions: ReactNode; onClose: () => void; dirty?: boolean; busy?: boolean }) {
  const leave = useAdminDraft(dirty, busy);
  const close = () => leave(onClose);
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"><div><DialogTitle>{title}</DialogTitle><DialogDescription className={description ? "mt-1" : "sr-only"}>{description ?? "内容を編集し、保存します。"}</DialogDescription></div><Button type="button" variant="ghost" size="icon" aria-label="閉じる" disabled={busy} onClick={close}><X className="size-5" /></Button></header>
    <div className="min-h-0 overflow-y-auto p-5">{children}</div>
    <AdminActions><Button type="button" variant="outline" disabled={busy} onClick={close}>キャンセル</Button>{actions}</AdminActions>
  </DialogContent></Dialog>;
}
