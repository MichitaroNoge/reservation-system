"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ListPagination } from "@/components/ui/list-pagination";
import { requestJson } from "@/app/reservations/api-client";
import type { ReplyTemplate } from "@/lib/inquiries/reply-template-types";

const endpoint = "/api/admin/inquiry-reply-templates";
const pageSize = 10;

export function ReplyTemplatePicker({ getAdminToken, onInsert, disabled }: {
  getAdminToken: () => Promise<string>;
  onInsert: (text: string) => () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  // Keep successful results only for this mounted answer screen, never across sessions.
  const loaded = useRef(false);
  const [loading, setLoading] = useState(false), [listError, setListError] = useState("");
  const [inserting, setInserting] = useState<string | null>(null), [error, setError] = useState("");
  const [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const insertingRef = useRef(false), alive = useRef(true);
  const focusAfterInsert = useRef<(() => void) | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!open || loaded.current) return;
    const controller = new AbortController();
    setLoading(true); setListError("");
    void (async () => {
      try {
        const result = await requestJson<{ templates: ReplyTemplate[] }>(endpoint + "?activeOnly=true&includeBody=true", { authToken: await token.current(), cache: "no-store", signal: controller.signal });
        if (!controller.signal.aborted) { loaded.current = true; setTemplates(result.templates); }
      } catch (e) {
        if (!controller.signal.aborted) setListError(e instanceof Error ? e.message : "定型文を読み込めませんでした。再読み込みしてください。");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [open, reload]);
  const refresh = () => { loaded.current = false; setError(""); setPage(1); setLoading(true); setReload(value => value + 1); };
  const insert = async (id: string) => {
    if (disabled || insertingRef.current) return;
    insertingRef.current = true; setInserting(id); setError("");
    try {
      const { template } = await requestJson<{ template: ReplyTemplate }>(endpoint + "/" + id, { authToken: await token.current(), cache: "no-store" });
      if (!alive.current || disabledRef.current) return;
      setTemplates(current => current.map(item => item.id === id ? template : item));
      if (!template.isActive) {
        throw new Error("この定型文は無効になっています。別の定型文を選択してください。");
      }
      focusAfterInsert.current = onInsert(template.body);
      setOpen(false);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "定型文を挿入できませんでした。もう一度お試しください。");
    } finally { insertingRef.current = false; if (alive.current) setInserting(null); }
  };
  return <div className="mt-2 space-y-2">
    <Button ref={trigger} type="button" variant="outline" disabled={disabled} onClick={() => { setError(""); setPage(1); setLoading(!loaded.current); setOpen(true); }}><Plus aria-hidden="true" />定型文を挿入</Button>
    <Dialog open={open} onOpenChange={value => { if (!insertingRef.current) setOpen(value); }}>
      <DialogContent aria-describedby={undefined} className="flex max-w-3xl flex-col overflow-hidden p-0" onInteractOutside={event => { if (insertingRef.current) event.preventDefault(); }} onCloseAutoFocus={event => {
        event.preventDefault();
        if (focusAfterInsert.current) { const focus = focusAfterInsert.current; focusAfterInsert.current = null; focus(); }
        else trigger.current?.focus();
      }}>
        <div className="flex items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="min-w-0">
            <DialogTitle>定型文を選択</DialogTitle>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="定型文を再読み込み" disabled={loading || !!inserting} onClick={refresh}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="定型文の選択を閉じる" disabled={!!inserting} onClick={() => setOpen(false)}><X /></Button>
          </div>
        </div>
        {error && <p role="alert" className="mx-5 mt-4 text-sm text-destructive sm:mx-6">{error}</p>}
        <div className="min-h-0 overflow-y-auto px-5 sm:px-6">
          {loading ? <p role="status" className="py-6 text-sm text-muted-foreground">定型文を読み込み中…</p> : listError ? <div className="space-y-3 py-6"><p role="alert" className="text-sm text-destructive">{listError}</p><Button type="button" variant="outline" onClick={refresh}>再読み込み</Button></div> : !templates.length ? <p className="py-6 text-sm text-muted-foreground">有効な定型文はありません。回答本文は直接入力できます。</p> : <ul className="divide-y divide-border">
            {templates.slice((page - 1) * pageSize, page * pageSize).map(template => {
              const characters = Array.from(template.body), long = characters.length > 160 || template.body.split("\n").length > 3;
              return <li key={template.id} className="py-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-semibold">{template.name}</h3>
                  <Button type="button" variant="outline" size="sm" aria-label={template.name + "を挿入"} disabled={disabled || !!inserting || !template.isActive} onClick={() => void insert(template.id)}>{inserting === template.id && <LoaderCircle className="animate-spin" />}{inserting === template.id ? "挿入中…" : "この定型文を挿入"}</Button>
                </div>
                {!template.isActive ? <p className="text-sm text-muted-foreground">この定型文は無効になりました。</p> : <>
                  <p title={long ? template.body : undefined} className={"whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground" + (long ? " line-clamp-3" : "")}>{characters.length > 160 ? characters.slice(0, 160).join("") + "…" : template.body}</p>
                  {long && <details className="mt-2 text-sm"><summary className="min-h-10 w-fit cursor-pointer py-2 font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">全文を表示</summary><p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border p-3 leading-6">{template.body}</p></details>}
                </>}
              </li>;
            })}
          </ul>}
        </div>
        {!loading && !listError && templates.length > pageSize && <ListPagination page={page} pageSize={pageSize} total={templates.length} loading={!!inserting} onPageChange={setPage} />}
        <div className="flex justify-end border-t border-border px-5 py-4 sm:px-6"><Button type="button" variant="outline" disabled={!!inserting} onClick={() => setOpen(false)}>閉じる</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
