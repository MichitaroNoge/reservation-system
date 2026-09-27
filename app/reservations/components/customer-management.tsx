"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Customer, CustomerForm } from "../types";

type CustomerManagementProps = {
  customers: Customer[];
  inactiveCustomers: Customer[];
  onCreateCustomer: (input: CustomerForm) => Promise<void>;
  onSaveCustomer: (originalName: string, input: CustomerForm) => Promise<void>;
  onDeleteCustomer: (name: string) => Promise<void>;
  onReactivateCustomer: (customer: Customer) => Promise<void>;
  notify: (message: string) => void;
};

export function CustomerManagement({ customers, inactiveCustomers, onSaveCustomer, onDeleteCustomer, onReactivateCustomer, notify }: CustomerManagementProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", contact: "", phone: "", address: "", accountType: "individual" });
  const [savingName, setSavingName] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startEdit = (customer: Customer) => {
    setEditingName(customer.name);
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

  const cancel = () => setEditingName(null);

  const save = async () => {
    if (!editingName || !form.id || !form.name || !form.contact || savingName) return;
    setSavingName(editingName);
    try {
      await onSaveCustomer(editingName, form);
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "アカウント情報の保存に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const remove = async (customer: Customer) => {
    const ok = window.confirm(`${customer.name} のログインアカウントを無効化します。過去の予約情報は変更されません。よろしいですか？`);
    if (!ok) return;
    try {
      await onDeleteCustomer(customer.name);
      if (editingName === customer.name) cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "アカウントの無効化に失敗しました");
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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Account master</p>
          <h2 className="mt-1 text-lg font-semibold">アカウント管理</h2>
          <small className="mt-1 block text-xs text-muted-foreground">ここにはログイン可能な利用者だけを表示します。管理者が代理入力した予約者は登録されません。</small>
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
        <Table>
          <TableHeader><TableRow><TableHead>アカウント名</TableHead><TableHead>メールアドレス</TableHead><TableHead>電話番号</TableHead><TableHead>住所</TableHead><TableHead>種別</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {customers.map((customer) => editingName === customer.name ? (
              <TableRow key={(customer.id ?? customer.name) + "-edit"} className="bg-muted/30">
                <TableCell><Input aria-label="アカウント名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></TableCell>
                <TableCell><Input aria-label="メールアドレス" type="email" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></TableCell>
                <TableCell><Input aria-label="電話番号" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></TableCell>
                <TableCell><Input aria-label="住所" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></TableCell>
                <TableCell>{form.accountType === "travel_agency" ? "旅行会社" : "一般"}</TableCell>
                <TableCell><div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={cancel}>キャンセル</Button><Button type="button" size="sm" disabled={!form.id || !form.name || !form.contact || savingName === editingName} onClick={save}>{savingName === editingName ? "保存中" : "保存"}</Button></div></TableCell>
              </TableRow>
            ) : (
              <TableRow key={customer.id ?? customer.name + "-" + customer.contact}>
                <TableCell><strong>{customer.name}</strong></TableCell><TableCell>{customer.contact}</TableCell><TableCell>{customer.phone || "-"}</TableCell><TableCell>{customer.address || "-"}</TableCell><TableCell><Badge variant="secondary">{customer.accountType === "travel_agency" ? "旅行会社" : "一般"}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => startEdit(customer)}>編集</Button><Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(customer)}>無効化</Button></div></TableCell>
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
