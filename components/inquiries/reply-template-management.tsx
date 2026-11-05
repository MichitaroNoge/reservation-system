"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, LoaderCircle, Pencil, Plus, RefreshCw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { requestJson } from "@/app/reservations/api-client";
import { replyTemplateFields, type ReplyTemplate, type ReplyTemplateFields, type ReplyTemplateSummary } from "@/lib/inquiries/reply-template-types";
import { inquiryDate } from "@/lib/inquiries/types";

const endpoint = "/api/admin/inquiry-reply-templates";
export function ReplyTemplateManagement({ getAdminToken }: { getAdminToken: () => Promise<string> }) {
  const [templates, setTemplates] = useState<ReplyTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true), [opening, setOpening] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [editorError, setEditorError] = useState(""), [success, setSuccess] = useState(""), [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<{ id: string; revision?: number } | null>(null);
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const savingRef = useRef(false), openingRef = useRef(false);
  const form = useForm<ReplyTemplateFields>({ resolver: zodResolver(replyTemplateFields), defaultValues: { name: "", body: "", isActive: true } });
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void (async () => { try {
      const result = await requestJson<{ templates: ReplyTemplateSummary[] }>(endpoint, { authToken: await token.current(), cache: "no-store", signal: controller.signal });
      if (!controller.signal.aborted) setTemplates(result.templates);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "テンプレートを読み込めませんでした。"); }
    finally { if (!controller.signal.aborted) setLoading(false); } })();
    return () => controller.abort();
  }, [reload]);
  const open = async (item?: ReplyTemplateSummary, copy = false) => {
    if (openingRef.current || savingRef.current) return;
    openingRef.current = true; setOpening(true); setError(""); setEditorError(""); setSuccess("");
    try {
      const source = item ? (await requestJson<{ template: ReplyTemplate }>(`${endpoint}/${item.id}`, { authToken: await token.current(), cache: "no-store" })).template : null;
      form.reset({ name: source ? copy ? `${source.name.slice(0, 95)}（コピー）` : source.name : "", body: source?.body ?? "", isActive: copy ? true : source?.isActive ?? true });
      setDraft({ id: !source || copy ? crypto.randomUUID() : source.id, revision: copy ? undefined : source?.revision });
    } catch (e) { setError(e instanceof Error ? e.message : "テンプレートを開けませんでした。"); }
    finally { openingRef.current = false; setOpening(false); }
  };
  const save = form.handleSubmit(async values => {
    if (!draft || savingRef.current) return;
    savingRef.current = true; setSaving(true); setEditorError("");
    try {
      const result = await requestJson<{ template: ReplyTemplate }>(draft.revision ? `${endpoint}/${draft.id}` : endpoint, {
        method: draft.revision ? "PUT" : "POST", authToken: await token.current(),
        body: JSON.stringify({ ...values, ...(draft.revision ? { revision: draft.revision } : { id: draft.id }) }),
      });
      const saved = result.template;
      setTemplates(current => [...current.filter(item => item.id !== saved.id), { id: saved.id, name: saved.name, isActive: saved.isActive, revision: saved.revision, createdAt: saved.createdAt, updatedAt: saved.updatedAt }].sort((a, b) => a.name.localeCompare(b.name, "ja-JP")));
      setDraft(null); setSuccess("テンプレートを保存しました。");
    } catch (e) { setEditorError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { savingRef.current = false; setSaving(false); }
  });
  return <>
    <ListPanel>
      <ListToolbar>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">回答本文に挿入する定型文を登録できます。挨拶・ご案内・結びなど、用途ごとに分けて登録してください。</p>
        <ResultCount count={templates.length} loading={loading} error={!!error} />
        <Button variant="outline" size="icon" aria-label="テンプレートを再読み込み" disabled={loading || opening} onClick={() => setReload(v => v + 1)}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /></Button>
        <Button disabled={loading || opening} onClick={() => void open()}><Plus className="size-4" />新規登録</Button>
      </ListToolbar>
      {success && <p role="status" className="px-5 pt-4 text-sm text-success">{success}</p>}
      {error && <p role="alert" className="p-5 text-sm text-destructive">{error}</p>}
      {opening && <p role="status" className="px-5 pt-4 text-sm text-muted-foreground">テンプレートを開いています…</p>}
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">読み込み中…</p> : !error && !templates.length ? <p className="p-8 text-center text-sm text-muted-foreground">テンプレートはまだありません。「新規登録」から追加してください。</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">テンプレート名</th><th className="px-5 py-3 font-medium">状態</th><th className="px-5 py-3 font-medium">最終更新日時</th><th className="sticky right-0 bg-card px-5 py-3 font-medium">操作</th></tr></thead>
          <tbody>{templates.map(item => <tr key={item.id} className="border-t border-border bg-card"><td className="max-w-80 break-words px-5 py-4 font-medium">{item.name}</td><td className="whitespace-nowrap px-5 py-4"><Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "有効" : "無効"}</Badge></td><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{inquiryDate(item.updatedAt)}</td><td className="sticky right-0 bg-card px-5 py-4"><div className="flex gap-2"><Button variant="outline" size="sm" disabled={opening} onClick={() => void open(item)} aria-label={`${item.name}を編集`}><Pencil className="size-4" />編集</Button><Button variant="outline" size="sm" disabled={opening} onClick={() => void open(item, true)} aria-label={`${item.name}を複製`}><Copy className="size-4" />複製</Button></div></td></tr>)}</tbody>
        </table>
      </div>}
    </ListPanel>
    <Dialog open={!!draft} onOpenChange={value => { if (!value && !saving) setDraft(null); }}>
      <DialogContent className="max-w-3xl p-5 sm:p-6" onInteractOutside={event => { if (saving) event.preventDefault(); }}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><DialogTitle className="text-lg font-semibold">{draft?.revision ? "テンプレートを編集" : "テンプレートを登録"}</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">登録した定型文は回答本文のカーソル位置に挿入できます。挿入後も、問い合わせごとに編集できます。</DialogDescription></div><Button variant="ghost" size="icon" aria-label="閉じる" disabled={saving} onClick={() => setDraft(null)}><X className="size-5" /></Button></div>
        {editorError && <p role="alert" className="mb-4 text-sm text-destructive">{editorError}</p>}
        <form noValidate onSubmit={save} className="space-y-5">
          <div><Label htmlFor="reply-template-name">テンプレート名 <span className="text-xs text-muted-foreground">必須</span></Label><Input id="reply-template-name" {...form.register("name")} maxLength={100} className="mt-2" disabled={saving} aria-invalid={!!form.formState.errors.name} aria-describedby={form.formState.errors.name ? "reply-template-name-error" : undefined} />{form.formState.errors.name && <p id="reply-template-name-error" role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.name.message}</p>}</div>
          <div><Label htmlFor="reply-template-body">挿入する定型文 <span className="text-xs text-muted-foreground">必須</span></Label><Textarea id="reply-template-body" {...form.register("body")} maxLength={10000} className="mt-2 min-h-64" disabled={saving} aria-invalid={!!form.formState.errors.body} aria-describedby={form.formState.errors.body ? "reply-template-body-error" : undefined} />{form.formState.errors.body && <p id="reply-template-body-error" role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.body.message}</p>}</div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" {...form.register("isActive")} className="size-4 accent-primary" disabled={saving} />有効（回答画面の選択肢に表示）</label>
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={() => setDraft(null)}>キャンセル</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "保存中…" : "保存"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
