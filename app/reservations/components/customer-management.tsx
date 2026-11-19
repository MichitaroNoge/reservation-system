"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { AdminFormDialog, useAdminInteractions } from "@/components/ui/admin-interactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Customer, CustomerForm } from "../types";

type CustomerManagementProps = {
  customers: Customer[];
  inactiveCustomers: Customer[];
  onCreateCustomer: (input: CustomerForm) => Promise<void>;
  onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onReactivateCustomer: (customer: Customer) => Promise<void>;
  notify: (message: string) => void;
};

export function CustomerManagement({ customers, inactiveCustomers, onSaveCustomer, onDeleteCustomer, onReactivateCustomer }: CustomerManagementProps) {
  const { confirm } = useAdminInteractions();
  const baseline = useRef("");
  const saving = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", contact: "", phone: "", address: "", accountType: "individual" });
  const [saveError, setSaveError] = useState("");
  const validation = useForm<CustomerForm & { id: string; phone: string }>({
    values: { ...form, id: form.id ?? "", phone: form.phone ?? "" },
    resolver: zodResolver(z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1, "アカウント名を入力してください").max(100),
      contact: z.string().email(),
      phone: z.string().trim().min(8, "電話番号は8〜30文字で入力してください").max(30, "電話番号は8〜30文字で入力してください").regex(/^[0-9+()\-\s]{8,30}$/, "電話番号の形式を確認してください"),
      address: z.string().max(500).optional(),
      accountType: z.enum(["individual", "travel_agency"]).optional(),
      companyBranchName: z.string().max(100).optional(),
      contactPersonName: z.string().max(100).optional(),
    })),
  });
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const reactivationPending = useRef(false);
  const [reactivationResult, setReactivationResult] = useState<{ id: string; error?: string; success?: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startEdit = (customer: Customer) => {
    if (!customer.id) return;
    setEditingId(customer.id);
    setSaveError("");
    const input = {
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      address: customer.address ?? "",
      accountType: customer.accountType ?? "individual",
      companyBranchName: customer.companyBranchName,
      contactPersonName: customer.contactPersonName,
      originalContact: customer.contact,
    };
    baseline.current = JSON.stringify(input);
    setForm(input);
  };

  const cancel = () => setEditingId(null);

  const save = validation.handleSubmit(async (values) => {
    const editingCustomer = customers.find(customer => customer.id === editingId);
    if (!editingCustomer || !form.id || saving.current) return;
    saving.current = true;
    setSaveError("");
    try {
      await onSaveCustomer(editingCustomer.name, values);
      cancel();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "アカウント情報の保存に失敗しました");
    } finally { saving.current = false; }
  });

  const remove = (customer: Customer) => {
    if (!customer.id) return;
    void confirm({ title: "アカウントを無効にしますか？", description: "このアカウントでログインできなくなります。過去の予約情報は保持されます。", details: <p className="break-words text-sm">{customer.name} / {customer.contact}</p>, confirmLabel: "無効にする", destructive: true, onConfirm: () => onDeleteCustomer(customer.id!) });
  };

  const reactivate = async (customer: Customer) => {
    if (!customer.id || reactivationPending.current || customer.lifecycleStatus !== "disabled" || customer.reactivationBlockedReason) return;
    reactivationPending.current = true;
    setReactivationResult(null);
    setReactivatingId(customer.id);
    try {
      await onReactivateCustomer(customer);
      setReactivationResult({ id: customer.id, success: `${customer.name}様を有効にしました。` });
    } catch (error) {
      setReactivationResult({ id: customer.id, error: error instanceof Error ? error.message : "アカウントの有効化に失敗しました" });
      return false;
    } finally {
      reactivationPending.current = false;
      setReactivatingId(null);
    }
  };

  const editField = (key: "name" | "phone" | "address" | "companyBranchName" | "contactPersonName", label: string) => (
    <FormField label={label} required={key === "name" || key === "phone"} error={validation.formState.errors[key]?.message}>
      <Input type={key === "phone" ? "tel" : "text"} value={form[key] ?? ""} disabled={validation.formState.isSubmitting} onChange={event => setForm({ ...form, [key]: event.target.value })} />
    </FormField>
  );

  return (
    <ListPanel>
      <ListToolbar>
        <div>
          <small className="block text-xs text-muted-foreground">登録されたアカウントを表示します。管理者が代理入力した予約者は登録されません。</small>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <ResultCount count={customers.length} />
          {inactiveCustomers.length ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "無効アカウントを隠す" : `無効アカウントを表示 (${inactiveCustomers.length})`}
            </Button>
          ) : null}
        </div>
      </ListToolbar>

      <div>
        <Table className="min-w-[960px]">
          <TableHeader><TableRow><TableHead>アカウント名</TableHead><TableHead>メールアドレス</TableHead><TableHead>電話番号</TableHead><TableHead>住所</TableHead><TableHead>種別</TableHead><TableHead className="sticky right-0 bg-card">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id ?? customer.name + "-" + customer.contact} className="cursor-pointer" onClick={() => { if (!window.getSelection()?.toString()) startEdit(customer); }}>
                <TableCell><strong>{customer.name}</strong></TableCell><TableCell>{customer.contact}</TableCell><TableCell>{customer.phone || "-"}</TableCell><TableCell>{customer.address || "-"}</TableCell><TableCell><Badge variant="secondary">{customer.accountType === "travel_agency" ? "旅行会社" : "一般"}</Badge></TableCell><TableCell className="sticky right-0 border-l bg-card"><div className="flex justify-end gap-2" onClick={event => event.stopPropagation()}><Button type="button" variant="outline" size="sm" disabled={!customer.id || validation.formState.isSubmitting} onClick={() => startEdit(customer)}>編集</Button><Button type="button" variant="ghost" size="sm" disabled={!customer.id} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(customer)}>無効にする</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!customers.length ? <EmptyState title="有効なログインアカウントはありません" /> : null}
      </div>

      {reactivationResult?.success && <p role="status" className="border-t p-5 text-sm text-success">{reactivationResult.success}</p>}
      {showInactive && inactiveCustomers.length ? (
        <div className="border-t bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">無効アカウント</h3><Badge variant="secondary">{inactiveCustomers.length}件</Badge></div>
          <Table className="min-w-[760px]">
            <TableHeader><TableRow><TableHead>アカウント名</TableHead><TableHead>ログイン用メールアドレス</TableHead><TableHead>状態</TableHead><TableHead className="sticky right-0 w-44 min-w-44 bg-card sm:w-72 sm:min-w-72">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {inactiveCustomers.map(customer => (
                <TableRow key={customer.id ?? customer.name + "-inactive"}>
                  <TableCell><strong>{customer.name}</strong></TableCell>
                  <TableCell>{customer.contact}</TableCell>
                  <TableCell><Badge variant="secondary">{customer.lifecycleStatus === "deleted" ? "本人による削除済み" : customer.lifecycleStatus === "deleting" ? "削除処理中" : customer.lifecycleStatus === "disabled" ? "管理者による無効化" : "状態確認が必要"}</Badge></TableCell>
                  <TableCell className="sticky right-0 w-44 min-w-44 max-w-44 border-l bg-card whitespace-normal sm:w-72 sm:min-w-72 sm:max-w-72">
                    {customer.lifecycleStatus === "disabled" && <Button type="button" size="sm" variant="outline" disabled={!customer.id || Boolean(reactivatingId) || Boolean(customer.reactivationBlockedReason)} onClick={() => void confirm({ title: "アカウントを有効にしますか？", description: "このアカウントで再びログインできるようにします。本人による削除済み・削除処理中のアカウントは有効化できません。", details: <p className="text-sm">{customer.name} / {customer.contact}</p>, confirmLabel: "有効にする", onConfirm: () => reactivate(customer) })}>{reactivatingId === customer.id ? "有効化中…" : "有効にする"}</Button>}
                    {customer.reactivationBlockedReason && <p className="mt-2 text-xs text-muted-foreground">{customer.reactivationBlockedReason}</p>}
                    {reactivationResult && reactivationResult.id === customer.id && reactivationResult.error && <p role="alert" className="mt-2 text-sm text-destructive">{reactivationResult.error}</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {editingId && <AdminFormDialog title="顧客情報を編集" onClose={cancel} dirty={JSON.stringify(form) !== baseline.current} busy={validation.formState.isSubmitting} actions={<Button type="submit" form="customer-editor" disabled={validation.formState.isSubmitting}>{validation.formState.isSubmitting ? "保存中…" : "保存する"}</Button>}>
        <form id="customer-editor" onSubmit={save} noValidate className="grid gap-5">
          {editField("name", "アカウント名")}
          <FormField label="メールアドレス"><Input value={form.contact} readOnly /><p className="mt-1 text-xs text-muted-foreground">メール変更は本人のアカウント画面から行います。</p></FormField>
          {editField("phone", "電話番号")}{editField("address", "住所")}
          {form.accountType === "travel_agency" && <>{editField("companyBranchName", "会社・支店名")}{editField("contactPersonName", "担当者名")}</>}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        </form>
      </AdminFormDialog>}
    </ListPanel>
  );
}
