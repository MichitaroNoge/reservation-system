"use client";

import { useState } from "react";
import { Icon } from "./common";
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

const emptyForm: CustomerForm = { name: "", contact: "", phone: "" };

export function CustomerManagement({
  customers,
  inactiveCustomers,
  onCreateCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  onReactivateCustomer,
  notify,
}: CustomerManagementProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startCreate = () => {
    setEditingName(null);
    setIsCreating(true);
    setForm(emptyForm);
  };

  const startEdit = (customer: Customer) => {
    setIsCreating(false);
    setEditingName(customer.name);
    setForm({
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      phone: customer.phone,
      originalContact: customer.contact,
    });
  };

  const cancel = () => {
    setEditingName(null);
    setIsCreating(false);
    setForm(emptyForm);
  };

  const saveNew = async () => {
    if (!form.name || !form.contact || !form.phone || savingName) return;
    setSavingName("__new__");
    try {
      await onCreateCustomer(form);
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "顧客情報の登録に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const save = async () => {
    if (!editingName || !form.name || !form.contact || !form.phone || savingName) return;
    setSavingName(editingName);
    try {
      await onSaveCustomer(editingName, form);
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "顧客情報の保存に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const remove = async (customer: Customer) => {
    const ok = window.confirm(`${customer.name}様の顧客情報を削除します。予約データは削除されません。よろしいですか？`);
    if (!ok) return;
    try {
      await onDeleteCustomer(customer.name);
      if (editingName === customer.name) cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "顧客情報の削除に失敗しました");
    }
  };

  const reactivate = async (customer: Customer) => {
    if (!customer.id || reactivatingId) return;
    setReactivatingId(customer.id);
    try {
      await onReactivateCustomer(customer);
    } catch (error) {
      notify(error instanceof Error ? error.message : "顧客情報の有効化に失敗しました");
    } finally {
      setReactivatingId(null);
    }
  };

  const createRow = isCreating ? (
    <tr className="editing-row new-customer-row">
      <td>
        <input aria-label="お名前" placeholder="お名前" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </td>
      <td>
        <input aria-label="メールアドレス" placeholder="name@example.jp" type="email" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
      </td>
      <td>
        <input aria-label="電話番号" placeholder="090-0000-0000" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </td>
      <td>0回</td>
      <td>-</td>
      <td>
        <div className="row-actions">
          <button type="button" disabled={savingName === "__new__"} onClick={cancel}>キャンセル</button>
          <button type="button" className="save" disabled={!form.name || !form.contact || !form.phone || savingName === "__new__"} onClick={saveNew}>
            {savingName === "__new__" ? "登録中" : "登録"}
          </button>
        </div>
      </td>
    </tr>
  ) : null;

  return (
    <section className="panel management-panel customer-management">
      <div className="customer-management-bar">
        <div>
          <strong>{customers.length}件</strong>
          <span>有効な顧客</span>
        </div>
        <div className="customer-management-actions">
          {inactiveCustomers.length ? (
            <button type="button" className={showInactive ? "active" : ""} onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "削除済みを隠す" : `削除済みを表示 (${inactiveCustomers.length})`}
            </button>
          ) : null}
          <button type="button" className="primary" onClick={startCreate} disabled={isCreating}>
            <Icon name="plus" />
            新規登録
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="large-table customer-table">
          <thead>
            <tr>
              <th>お客様</th>
              <th>メールアドレス</th>
              <th>電話番号</th>
              <th>予約回数</th>
              <th>最終利用</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {createRow}
            {customers.map((customer) =>
              editingName === customer.name ? (
                <tr key={(customer.id ?? customer.name) + "-edit"} className="editing-row">
                  <td>
                    <input aria-label="お名前" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </td>
                  <td>
                    <input aria-label="メールアドレス" type="email" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
                  </td>
                  <td>
                    <input aria-label="電話番号" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                  </td>
                  <td>{customer.count}回</td>
                  <td>{customer.last}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" disabled={savingName === editingName} onClick={cancel}>キャンセル</button>
                      <button type="button" className="save" disabled={!form.name || !form.contact || !form.phone || savingName === editingName} onClick={save}>
                        {savingName === editingName ? "保存中" : "保存"}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={customer.id ?? customer.name + "-" + customer.contact}>
                  <td><strong>{customer.name} 様</strong></td>
                  <td>{customer.contact}</td>
                  <td>{customer.phone}</td>
                  <td><strong>{customer.count}回</strong></td>
                  <td>{customer.last}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(customer)}>編集</button>
                      <button type="button" className="danger" onClick={() => remove(customer)}>削除</button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {!customers.length && !isCreating ? <div className="empty-table">有効な顧客情報はありません。</div> : null}
      </div>

      {showInactive && inactiveCustomers.length ? (
        <div className="inactive-customer-section">
          <div className="subsection-head">
            <div>
              <h3>削除済み顧客</h3>
              <p>必要な顧客だけ有効に戻せます。</p>
            </div>
            <span>{inactiveCustomers.length}件</span>
          </div>
          <div className="table-wrap">
            <table className="large-table customer-table inactive-table">
              <thead>
                <tr>
                  <th>お客様</th>
                  <th>メールアドレス</th>
                  <th>電話番号</th>
                  <th>予約回数</th>
                  <th>最終利用</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inactiveCustomers.map((customer) => (
                  <tr key={customer.id ?? customer.name + "-inactive"}>
                    <td><strong>{customer.name} 様</strong></td>
                    <td>{customer.contact}</td>
                    <td>{customer.phone}</td>
                    <td><strong>{customer.count}回</strong></td>
                    <td>{customer.last}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="save" disabled={!customer.id || reactivatingId === customer.id} onClick={() => reactivate(customer)}>
                          {reactivatingId === customer.id ? "有効化中" : "有効にする"}
                        </button>
                      </div>
                    </td>
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
