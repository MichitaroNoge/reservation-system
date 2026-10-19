"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function CustomerManagement({ customers, inactiveCustomers, onSaveCustomer, onDeleteCustomer, onReactivateCustomer, notify }: CustomerManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", contact: "", phone: "", address: "", accountType: "individual" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const validation = useForm<CustomerForm>({
    values: form,
    resolver: zodResolver(z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1, "アカウント名を入力してください").max(100),
      contact: z.string().email(),
      phone: z.string().trim().min(1, "電話番号を入力してください").max(30).regex(/^[0-9+()\-\s]+$/, "電話番号の形式を確認してください"),
      address: z.string().max(500).optional(),
      accountType: z.enum(["individual", "travel_agency"]).optional(),
      companyBranchName: z.string().max(100).optional(),
      contactPersonName: z.string().max(100).optional(),
    })),
  });
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startEdit = (customer: Customer) => {
    if (!customer.id) return;
    setEditingId(customer.id);
    setSaveError("");
    setForm({
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      address: customer.address ?? "",
      accountType: customer.accountType ?? "individual",
      companyBranchName: customer.companyBranchName,
      contactPersonName: customer.contactPersonName,
      originalContact: customer.contact,
    });
  };

  const cancel = () => setEditingId(null);

  const save = validation.handleSubmit(async (values) => {
    const editingCustomer = customers.find(customer => customer.id === editingId);
    if (!editingCustomer || !form.id) return;
    setSaveError("");
    try {
      await onSaveCustomer(editingCustomer.name, values);
      cancel();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "アカウント情報の保存に失敗しました");
    }
  });

  const remove = async (customer: Customer) => {
    if (!customer.id || deletingId) return;
    const ok = window.confirm(`${customer.name} のログインアカウントを無効化します。過去の予約情報は変更されません。よろしいですか？`);
    if (!ok) return;
    setDeletingId(customer.id);
    try {
      await onDeleteCustomer(customer.id);
      if (editingId === customer.id) cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "アカウントの無効化に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const reactivate = async (customer: Customer) => {
    if (!customer.id || reactivatingId) return;
    setReactivatingId(customer.id);
    try {
      await onReactivateCustomer(customer);
    } catch (error) {
      notify(error instanceof Error ? error.message : "アカウントの有効化に失敗しました");
    } finally {
      setReactivatingId(null);
    }
  };

  const editField = (key: "name" | "phone" | "address" | "companyBranchName" | "contactPersonName", label: string) => (
    <div className="grid min-w-40 gap-1">
      <Label htmlFor={`customer-edit-${key}`}>{label}</Label>
      <Input id={`customer-edit-${key}`} type={key === "phone" ? "tel" : "text"} value={form[key] ?? ""} disabled={validation.formState.isSubmitting} aria-invalid={Boolean(validation.formState.errors[key])} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
      {validation.formState.errors[key] && <p className="text-xs text-destructive">{validation.formState.errors[key]?.message}</p>}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Account master</p>
          <h2 className="mt-1 text-lg font-semibold">アカウント管理</h2>
          <small className="mt-1 block text-xs text-muted-foreground">登録されたアカウントを表示します。管理者が代理入力した予約者は登録されません。</small>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{customers.length}件</Badge>
          {inactiveCustomers.length ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "無効アカウントを隠す" : `無効アカウントを表示 (${inactiveCustomers.length})`}
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        {saveError && <Alert className="m-5 border-destructive/40 text-destructive">{saveError}</Alert>}
        <Table className="min-w-[960px]">
          <TableHeader><TableRow><TableHead>アカウント名</TableHead><TableHead>メールアドレス</TableHead><TableHead>電話番号</TableHead><TableHead>住所</TableHead><TableHead>種別</TableHead><TableHead className="sticky right-0 bg-card">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {customers.map((customer) => editingId === customer.id ? (
              <TableRow key={(customer.id ?? customer.name) + "-edit"} className="bg-muted/30">
                <TableCell><div className="grid gap-3">{editField("name", "アカウント名")}{form.accountType === "travel_agency" && <>{editField("companyBranchName", "会社・支店名")}{editField("contactPersonName", "担当者名")}</>}</div></TableCell>
                <TableCell><p>{customer.contact}</p><p className="mt-1 text-xs text-muted-foreground">メール変更は本人のアカウント画面から行います。</p></TableCell>
                <TableCell>{editField("phone", "電話番号")}</TableCell>
                <TableCell>{editField("address", "住所")}</TableCell>
                <TableCell>{form.accountType === "travel_agency" ? "旅行会社" : "一般"}</TableCell>
                <TableCell className="sticky right-0 border-l bg-card"><div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" disabled={validation.formState.isSubmitting} onClick={cancel}>キャンセル</Button><Button type="button" size="sm" disabled={!form.id || validation.formState.isSubmitting} onClick={() => void save()}>{validation.formState.isSubmitting ? "保存中" : "保存"}</Button></div></TableCell>
              </TableRow>
            ) : (
              <TableRow key={customer.id ?? customer.name + "-" + customer.contact}>
                <TableCell><strong>{customer.name}</strong></TableCell><TableCell>{customer.contact}</TableCell><TableCell>{customer.phone || "-"}</TableCell><TableCell>{customer.address || "-"}</TableCell><TableCell><Badge variant="secondary">{customer.accountType === "travel_agency" ? "旅行会社" : "一般"}</Badge></TableCell><TableCell className="sticky right-0 border-l bg-card"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={!customer.id || validation.formState.isSubmitting || Boolean(deletingId)} onClick={() => startEdit(customer)}>編集</Button><Button type="button" variant="ghost" size="sm" disabled={!customer.id || Boolean(deletingId)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(customer)}>{deletingId === customer.id ? "無効化中" : "無効化"}</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!customers.length ? <EmptyState title="有効なログインアカウントはありません" /> : null}
      </div>

      {showInactive && inactiveCustomers.length ? (
        <div className="border-t bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">無効アカウント</h3><Badge variant="secondary">{inactiveCustomers.length}件</Badge></div>
          <div className="table-wrap">
            <table className="large-table customer-table inactive-table">
              <thead><tr><th>アカウント名</th><th>メールアドレス</th><th>電話番号</th><th>住所</th><th>種別</th><th /></tr></thead>
              <tbody>
                {inactiveCustomers.map((customer) => (
                  <tr key={customer.id ?? customer.name + "-inactive"}>
                    <td><strong>{customer.name}</strong></td><td>{customer.contact}</td><td>{customer.phone || "-"}</td><td>{customer.address || "-"}</td><td>{customer.accountType === "travel_agency" ? "旅行会社" : "一般"}</td>
                    <td><div className="row-actions"><button type="button" className="save" disabled={!customer.id || reactivatingId === customer.id} onClick={() => reactivate(customer)}>{reactivatingId === customer.id ? "有効化中" : "有効にする"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
