"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { AdminFormDialog, useAdminInteractions } from "@/components/ui/admin-interactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Store, Menu } from "../types";

const schema = z.object({
  name: z.string().trim().min(1, "名前を入力してください。").max(100, "100文字以内で入力してください。"),
  displayOrder: z.number({ invalid_type_error: "表示順を入力してください。" }).int("整数を入力してください。").min(0, "0以上を入力してください。").max(9999, "9999以下を入力してください。"),
  description: z.string().max(1000, "1000文字以内で入力してください。"),
  price: z.number({ invalid_type_error: "金額を入力してください。" }).int("整数を入力してください。").min(0, "0以上を入力してください。").max(9999999, "9999999円以下を入力してください。"),
  minutes: z.number({ invalid_type_error: "利用時間を入力してください。" }).int("整数を入力してください。").min(0, "0以上を入力してください。"),
});
type Values = z.infer<typeof schema>;
type Item = Store | Menu;
type Props = { kind: "store" | "menu"; items: Item[]; inactive: Item[]; onSave: (values: Values, original?: Item) => Promise<void>; onDisable: (item: Item) => Promise<void>; onEnable: (item: Item) => Promise<void> };

export function CatalogManagement({ kind, items, inactive, onSave, onDisable, onEnable }: Props) {
  const { confirm } = useAdminInteractions();
  const [editing, setEditing] = useState<{ original?: Item } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const title = kind === "store" ? "店舗" : "メニュー";
  const open = (original?: Item) => setEditing({ original });
  const changeState = (item: Item, enable: boolean) => void confirm({
    title: `${title}を${enable ? "有効" : "無効"}にしますか？`,
    description: enable ? "新規予約の選択肢に表示します。" : `新規予約の選択肢から除外します。既存予約の${kind === "store" ? "店舗割当" : "メニューと金額"}は保持されます。`,
    details: <p className="break-words text-sm font-medium">{item.name}</p>,
    confirmLabel: enable ? "有効にする" : "無効にする", destructive: !enable,
    onConfirm: () => enable ? onEnable(item) : onDisable(item),
  });
  const table = (rows: Item[], disabled = false) => <Table className={kind === "menu" ? "min-w-[900px]" : "min-w-[640px]"}>
    <TableHeader><TableRow><TableHead>表示順</TableHead><TableHead>{title}名</TableHead>{kind === "menu" && <><TableHead>説明</TableHead><TableHead>金額</TableHead><TableHead>利用時間</TableHead></>}<TableHead>状態</TableHead><TableHead className="sticky right-0 bg-muted">操作</TableHead></TableRow></TableHeader>
    <TableBody>{rows.map(item => <TableRow key={item.id ?? item.name} className={disabled ? "" : "cursor-pointer"} onClick={disabled ? undefined : () => { if (!window.getSelection()?.toString()) open(item); }}>
      <TableCell>{item.displayOrder ?? 0}</TableCell><TableCell>{disabled ? <strong>{item.name}</strong> : <button type="button" className="min-h-11 rounded-sm text-left font-semibold focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.stopPropagation(); open(item); }}>{item.name}</button>}</TableCell>
      {kind === "menu" && "price" in item && <><TableCell>{item.description || "—"}</TableCell><TableCell>¥{item.price.toLocaleString()}</TableCell><TableCell>{item.duration || "来店後"}</TableCell></>}
      <TableCell><Badge variant={disabled ? "secondary" : "success"}>{disabled ? "無効" : "有効"}</Badge></TableCell>
      <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2" onClick={event => event.stopPropagation()}>{disabled ? <Button type="button" variant="outline" size="sm" disabled={!item.id} onClick={() => changeState(item, true)}>有効にする</Button> : <><Button type="button" variant="outline" size="sm" onClick={() => open(item)}>編集</Button><Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => changeState(item, false)}>無効にする</Button></>}</div></TableCell>
    </TableRow>)}</TableBody>
  </Table>;
  return <ListPanel><ListToolbar><ResultCount count={items.length} /><div className="flex flex-wrap gap-2">{inactive.length > 0 && <Button type="button" variant="outline" onClick={() => setShowInactive(value => !value)}>{showInactive ? "無効を隠す" : `無効を表示 (${inactive.length})`}</Button>}<Button type="button" onClick={() => open()}><Plus className="size-4" />新規登録</Button></div></ListToolbar>
    {table(items)}{!items.length && <EmptyState title={`有効な${title}はありません`} />}
    {showInactive && <section className="border-t border-border pt-5"><h3 className="mb-3 px-5 text-sm font-semibold">無効な{title}（{inactive.length}件）</h3>{table(inactive, true)}</section>}
    {editing && <CatalogEditor key={editing.original?.id ?? editing.original?.name ?? "new"} title={title} kind={kind} original={editing.original} onClose={() => setEditing(null)} onSave={values => onSave(values, editing.original)} />}
  </ListPanel>;
}

function CatalogEditor({ title, kind, original, onSave, onClose }: { title: string; kind: Props["kind"]; original?: Item; onSave: (values: Values) => Promise<void>; onClose: () => void }) {
  const menu = original && "price" in original ? original : null;
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: original?.name ?? "", displayOrder: original?.displayOrder ?? 0, description: menu?.description ?? "", price: menu?.price ?? 0, minutes: menu ? Number(menu.duration.match(/\d+/)?.[0] ?? 0) : 45 } });
  const [error, setError] = useState("");
  const saving = useRef(false);
  const save = form.handleSubmit(async values => { if (saving.current) return; saving.current = true; setError(""); try { await onSave(values); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "保存できませんでした。"); } finally { saving.current = false; } });
  const field = (key: keyof Values, label: string, numeric = false, required = false) => <FormField label={label} required={required} error={form.formState.errors[key]?.message}><Input type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} disabled={form.formState.isSubmitting} {...form.register(key, { valueAsNumber: numeric })} /></FormField>;
  return <AdminFormDialog title={`${title}を${original ? "編集" : "登録"}`} dirty={form.formState.isDirty} busy={form.formState.isSubmitting} onClose={onClose} actions={<Button type="submit" form="catalog-editor" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "保存中…" : "保存する"}</Button>}>
    <form id="catalog-editor" className="grid gap-5" noValidate onSubmit={save}>{field("name", `${title}名`, false, true)}{field("displayOrder", "表示順", true, true)}{kind === "menu" && <>{field("description", "説明")}{field("price", "金額（円）", true, true)}{field("minutes", "利用時間（分・来店後は0）", true, true)}</>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>
  </AdminFormDialog>;
}
