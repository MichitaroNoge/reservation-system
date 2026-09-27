"use client";

import { useEffect, useState } from "react";
import { Eye, LoaderCircle, Mail, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  emailTemplateDefinitions,
  isEmailTemplateKey,
} from "@/lib/email/email-template-catalog";
import type { EmailTemplate } from "../types";
import { requestJson } from "../api-client";

export function EmailTemplateManagement({
  getAdminToken,
  notify,
}: {
  getAdminToken: () => Promise<string>;
  notify: (message: string, variant?: "success" | "error" | "info") => void;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const auth = async () => ({ authToken: await getAdminToken() });
  useEffect(() => {
    void (async () => {
      try {
        const result = await requestJson<{ templates: EmailTemplate[] }>(
          "/api/email-templates",
          await auth(),
        );
        setTemplates(result.templates);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "メールテンプレートを読み込めませんでした。",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openEditor = (template: EmailTemplate) => {
    setSelected(template);
    setDraft({ ...template });
    setPreview(null);
    setError("");
  };
  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await requestJson<{ template: EmailTemplate }>(
        `/api/email-templates/${draft.templateKey}`,
        { ...(await auth()), method: "PUT", body: JSON.stringify(draft) },
      );
      setTemplates((items) =>
        items.map((item) =>
          item.templateKey === result.template.templateKey
            ? result.template
            : item,
        ),
      );
      setSelected(result.template);
      setDraft(result.template);
      notify("メールテンプレートを保存しました。");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };
  const showPreview = async () => {
    if (!draft) return;
    setError("");
    try {
      const result = await requestJson<{
        preview: { subject: string; body: string };
      }>("/api/email-templates/preview", {
        ...(await auth()),
        method: "POST",
        body: JSON.stringify(draft),
      });
      setPreview(result.preview);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "プレビューを作成できませんでした。",
      );
    }
  };

  if (loading)
    return (
      <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        読み込み中
      </div>
    );
  if (!selected || !draft)
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-semibold">メールテンプレート</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              送信メールの件名と本文を管理します。
            </p>
          </div>
          <Mail className="size-5 text-muted-foreground" />
        </div>
        {error && (
          <div className="p-5">
            <Alert className="border-destructive/40 text-destructive">{error}</Alert>
          </div>
        )}
        {templates.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>テンプレート名</TableHead>
                <TableHead>templateKey</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>最終更新日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.templateKey}
                  className="cursor-pointer"
                  onClick={() => openEditor(template)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {template.templateKey}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isActive ? "success" : "secondary"}
                    >
                      {template.isActive ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.updatedAt
                      ? new Date(template.updatedAt).toLocaleString("ja-JP")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="テンプレートがありません"
            description="初期テンプレートを登録できませんでした。"
          />
        )}
      </Card>
    );

  const definition = isEmailTemplateKey(draft.templateKey)
    ? emailTemplateDefinitions[draft.templateKey]
    : null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => {
            setSelected(null);
            setDraft(null);
            setPreview(null);
          }}
        >
          一覧へ戻る
        </Button>
        <div className="grid gap-5">
          <div>
            <Label>テンプレート</Label>
            <p className="mt-1 font-semibold">{draft.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {draft.templateKey}
            </p>
          </div>
          <div>
            <Label htmlFor="email-template-subject">件名</Label>
            <Input
              id="email-template-subject"
              value={draft.subject}
              onChange={(event) =>
                setDraft({ ...draft, subject: event.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="email-template-body">本文</Label>
            <Textarea
              id="email-template-body"
              className="min-h-80 font-mono leading-6"
              value={draft.body}
              onChange={(event) =>
                setDraft({ ...draft, body: event.target.value })
              }
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft({ ...draft, isActive: event.target.checked })
              }
            />
            このテンプレートを有効にする
          </label>
          {error && <Alert className="border-destructive/40 text-destructive">{error}</Alert>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={showPreview}>
              <Eye className="size-4" />
              プレビュー
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="size-4" />
              {saving ? "保存中" : "保存"}
            </Button>
          </div>
        </div>
      </Card>
      <div className="grid content-start gap-5">
        <Card className="p-5">
          <h3 className="font-semibold">利用可能な変数</h3>
          <div className="mt-4 grid gap-3">
            {definition &&
              Object.entries(definition.variables).map(([key, label]) => (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_auto] gap-3 text-sm"
                >
                  <code className="rounded bg-muted px-2 py-1">{`{{${key}}}`}</code>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
          </div>
        </Card>
        {preview && (
          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <span className="text-xs text-muted-foreground">件名</span>
              <strong className="mt-1 block text-sm">{preview.subject}</strong>
            </div>
            <div className="whitespace-pre-wrap p-5 text-sm leading-7">
              {preview.body}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
