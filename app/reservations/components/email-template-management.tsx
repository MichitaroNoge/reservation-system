"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, RefreshCw } from "lucide-react";
import { AdminActions, AdminFormDialog, useAdminDraft, useAdminInteractions } from "@/components/ui/admin-interactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { emailTemplateDefinitions, isEmailTemplateKey } from "@/lib/email/email-template-catalog";
import type { EmailSettings, EmailTemplate } from "../types";
import { requestJson } from "../api-client";

type Props = { getAdminToken: () => Promise<string>; notify: (message: string, variant?: "success" | "error" | "info") => void };
export function EmailTemplateManagement({ getAdminToken, notify }: Props) {
  const token = useRef(getAdminToken); token.current = getAdminToken;
  const { leave } = useAdminInteractions();
  const [data, setData] = useState<{ templates: EmailTemplate[]; settings: EmailSettings; allowedFromEmails: string[] } | null>(null);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void (async () => {
      try {
        const options = { authToken: await token.current(), signal: controller.signal, cache: "no-store" as const };
        const [templates, settings] = await Promise.all([requestJson<{ templates: EmailTemplate[] }>("/api/email-templates", options), requestJson<{ settings: EmailSettings; allowedFromEmails: string[] }>("/api/email-settings", options)]);
        if (!controller.signal.aborted) setData({ ...templates, ...settings });
      } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "メール設定を読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [reload]);
  const open = (template: EmailTemplate) => setSelected(template);
  return <div className="grid gap-5">
    {error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={() => leave(() => setReload(value => value + 1))}>再読み込み</Button></div>}
    {loading && <p role="status" className="p-5 text-sm text-muted-foreground">メール設定を読み込み中…</p>}
    {!loading && data && <><SenderSettings settings={data.settings} allowedFromEmails={data.allowedFromEmails} getAdminToken={() => token.current()} notify={notify} />
      <ListPanel><ListToolbar><ResultCount count={data.templates.length} /><Button variant="outline" onClick={() => leave(() => setReload(value => value + 1))}><RefreshCw className="size-4" />再読み込み</Button></ListToolbar>
        <Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>テンプレート</TableHead><TableHead>件名</TableHead><TableHead>メール送信</TableHead><TableHead className="sticky right-0 bg-muted">操作</TableHead></TableRow></TableHeader><TableBody>{data.templates.map(template => <TableRow key={template.templateKey} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) open(template); }}><TableCell><button type="button" className="min-h-11 rounded-sm text-left font-semibold focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); open(template); }}>{template.name}</button></TableCell><TableCell>{template.subject}</TableCell><TableCell><Badge variant={template.isActive ? "success" : "secondary"}>{template.isActive ? "有効" : "停止中"}</Badge></TableCell><TableCell className="sticky right-0 bg-card"><Button variant="outline" onClick={event => { event.stopPropagation(); open(template); }}>編集</Button></TableCell></TableRow>)}</TableBody></Table>
        {!data.templates.length && <EmptyState title="メールテンプレートはありません" />}
      </ListPanel>
    </>}
    {selected && <TemplateEditor key={selected.templateKey} template={selected} getAdminToken={() => token.current()} onClose={() => setSelected(null)} onSaved={template => { setData(current => current && ({ ...current, templates: current.templates.map(item => item.templateKey === template.templateKey ? template : item) })); notify("メールテンプレートを保存しました。", "success"); setSelected(null); }} />}
  </div>;
}

const senderSchema = z.object({ senderName: z.string().trim().min(1, "送信者名を入力してください。"), fromEmail: z.string().email("送信元メールアドレスを確認してください。"), replyToEnabled: z.boolean(), replyToEmail: z.string().nullable() }).superRefine((value, context) => { if (value.replyToEnabled && !z.string().email().safeParse(value.replyToEmail).success) context.addIssue({ code: "custom", path: ["replyToEmail"], message: "返信先メールアドレスを正しく入力してください。" }); });
function SenderSettings({ settings, allowedFromEmails, getAdminToken, notify }: { settings: EmailSettings; allowedFromEmails: string[] } & Props) {
  const form = useForm<EmailSettings>({ resolver: zodResolver(senderSchema), defaultValues: settings });
  const [error, setError] = useState("");
  useAdminDraft(form.formState.isDirty, form.formState.isSubmitting);
  const enabled = form.watch("replyToEnabled");
  const save = form.handleSubmit(async values => { setError(""); try { const result = await requestJson<{ settings: EmailSettings }>("/api/email-settings", { authToken: await getAdminToken(), method: "PUT", body: JSON.stringify(values) }); form.reset(result.settings); notify("メール送信設定を保存しました。", "success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "保存できませんでした。"); } });
  return <Card className="overflow-hidden"><div className="p-5"><h2 className="font-semibold">メール送信設定</h2></div><form onSubmit={save} noValidate><fieldset disabled={form.formState.isSubmitting} className="grid gap-5 px-5 pb-5 sm:grid-cols-2">
    <FormField label="送信者名" required error={form.formState.errors.senderName?.message}><Input {...form.register("senderName")} /></FormField>
    <FormField label="送信元メールアドレス" required error={form.formState.errors.fromEmail?.message}><Select {...form.register("fromEmail")}>{allowedFromEmails.map(email => <option key={email} value={email}>{email}</option>)}</Select></FormField>
    <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" {...form.register("replyToEnabled")} className="size-4 accent-primary" />指定したアドレスで返信を受け付ける</label>
    {enabled && <FormField label="返信先メールアドレス" required error={form.formState.errors.replyToEmail?.message}><Input type="email" {...form.register("replyToEmail")} /></FormField>}
    {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
  </fieldset><AdminActions><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>{form.formState.isSubmitting ? "保存中…" : "送信設定を保存する"}</Button></AdminActions></form></Card>;
}

const templateSchema = z.object({ subject: z.string().trim().min(1, "件名を入力してください。"), body: z.string().min(1, "本文を入力してください。"), isActive: z.boolean() });
function TemplateEditor({ template, getAdminToken, onClose, onSaved }: { template: EmailTemplate; getAdminToken: () => Promise<string>; onClose: () => void; onSaved: (template: EmailTemplate) => void }) {
  const form = useForm<z.infer<typeof templateSchema>>({ resolver: zodResolver(templateSchema), defaultValues: template });
  const { confirm } = useAdminInteractions();
  const [error, setError] = useState(""), [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const saveValues = async (values: z.infer<typeof templateSchema>) => { const result = await requestJson<{ template: EmailTemplate }>(`/api/email-templates/${template.templateKey}`, { authToken: await getAdminToken(), method: "PUT", body: JSON.stringify({ ...template, ...values }) }); onSaved(result.template); };
  const save = form.handleSubmit(async values => { setError(""); try {
    if (template.isActive && !values.isActive) await confirm({ title: "この種類のメールを停止しますか？", description: "このテンプレートを使用するメールが送信されなくなります。編集した件名・本文も保存します。", details: <p className="text-sm">{template.name}</p>, confirmLabel: "停止して保存する", destructive: true, onConfirm: () => saveValues(values) });
    else await saveValues(values);
  } catch (caught) { setError(caught instanceof Error ? caught.message : "保存できませんでした。"); } });
  const showPreview = form.handleSubmit(async values => { setError(""); setPreviewing(true); try { const result = await requestJson<{ preview: { subject: string; body: string } }>("/api/email-templates/preview", { authToken: await getAdminToken(), method: "POST", body: JSON.stringify({ ...template, ...values }) }); setPreview(result.preview); } catch (caught) { setError(caught instanceof Error ? caught.message : "プレビューを作成できませんでした。"); } finally { setPreviewing(false); } });
  const definition = isEmailTemplateKey(template.templateKey) ? emailTemplateDefinitions[template.templateKey] : null;
  return <AdminFormDialog title={`${template.name}を編集`} dirty={form.formState.isDirty} busy={form.formState.isSubmitting} onClose={onClose} actions={<><Button type="button" variant="outline" disabled={previewing || form.formState.isSubmitting} onClick={() => void showPreview()}><Eye className="size-4" />{previewing ? "作成中…" : "プレビュー"}</Button><Button type="submit" form="email-template-editor" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "保存中…" : "保存する"}</Button></>}>
    <form id="email-template-editor" noValidate onSubmit={save} className="grid gap-5"><fieldset disabled={form.formState.isSubmitting} className="grid min-w-0 gap-5">
      <FormField label="件名" required error={form.formState.errors.subject?.message}><Input {...form.register("subject")} /></FormField>
      <FormField label="本文" required error={form.formState.errors.body?.message}><Textarea className="min-h-64" {...form.register("body")} /></FormField>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" {...form.register("isActive")} className="size-4 accent-primary" />この種類のメールを送信する</label>
      {!form.watch("isActive") && <p className="text-sm text-warning">保存すると、この種類のメールは送信されません。</p>}
      {definition && <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">利用可能な変数</summary><dl className="mt-3 grid gap-2">{Object.entries(definition.variables).map(([key, label]) => <div key={key} className="flex flex-wrap justify-between gap-2 text-sm"><dt><code>{`{{${key}}}`}</code></dt><dd className="text-muted-foreground">{label}</dd></div>)}</dl></details>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </fieldset></form>
    {preview && <section aria-label="メールプレビュー" className="mt-5 space-y-3 border-t border-border pt-5"><h3 className="text-sm font-semibold">{preview.subject}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7">{preview.body}</p></section>}
  </AdminFormDialog>;
}
