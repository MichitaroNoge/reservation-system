"use client";

import { useState } from "react";
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
    <section className="panel management-panel customer-management">
      <div className="customer-management-bar">
        <div>
          <p className="form-kicker">ACCOUNT MASTER</p>
          <h2>アカウント管理</h2>
          <small>ここにはログイン可能な利用者だけを表示します。管理者が代理入力した予約者は登録されません。</small>
        </div>
        <div className="customer-management-actions">
          <strong>{customers.length}件</strong>
          {inactiveCustomers.length ? (
            <button type="button" className={showInactive ? "active" : ""} onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "無効アカウントを隠す" : `無効アカウントを表示 (${inactiveCustomers.length})`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table className="large-table customer-table">
          <thead>
            <tr>
              <th>アカウント名</th>
              <th>メールアドレス</th>
              <th>電話番号</th>
              <th>住所</th>
              <th>種別</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => editingName === customer.name ? (
              <tr key={(customer.id ?? customer.name) + "-edit"} className="editing-row">
                <td><input aria-label="アカウント名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></td>
                <td><input aria-label="メールアドレス" type="email" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></td>
                <td><input aria-label="電話番号" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></td>
                <td><input aria-label="住所" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></td>
                <td>{form.accountType === "travel_agency" ? "旅行会社" : "一般"}</td>
                <td><div className="row-actions"><button type="button" onClick={cancel}>キャンセル</button><button type="button" className="save" disabled={!form.id || !form.name || !form.contact || savingName === editingName} onClick={save}>{savingName === editingName ? "保存中" : "保存"}</button></div></td>
              </tr>
            ) : (
              <tr key={customer.id ?? customer.name + "-" + customer.contact}>
                <td><strong>{customer.name}</strong></td>
                <td>{customer.contact}</td>
                <td>{customer.phone || "-"}</td>
                <td>{customer.address || "-"}</td>
                <td>{customer.accountType === "travel_agency" ? "旅行会社" : "一般"}</td>
                <td><div className="row-actions"><button type="button" onClick={() => startEdit(customer)}>編集</button><button type="button" className="danger" onClick={() => remove(customer)}>無効化</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length ? <div className="empty-table">有効なログインアカウントはありません。</div> : null}
      </div>

      {showInactive && inactiveCustomers.length ? (
        <div className="inactive-customer-section">
          <div className="subsection-head"><div><h3>無効アカウント</h3></div><span>{inactiveCustomers.length}件</span></div>
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
    </section>
  );
}
