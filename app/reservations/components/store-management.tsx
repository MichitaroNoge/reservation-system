"use client";

import { useState } from "react";
import { Icon } from "./common";
import type { Store, StoreForm } from "../types";

type StoreManagementProps = {
  stores: Store[];
  inactiveStores: Store[];
  onCreateStore: (input: StoreForm) => Promise<void>;
  onSaveStore: (originalName: string, input: StoreForm) => Promise<void>;
  onDeleteStore: (name: string) => Promise<void>;
  onReactivateStore: (store: Store) => Promise<void>;
  notify: (message: string) => void;
};

const emptyStore: StoreForm = { name: "", displayOrder: 0 };

export function StoreManagement({
  stores,
  inactiveStores,
  onCreateStore,
  onSaveStore,
  onDeleteStore,
  onReactivateStore,
  notify,
}: StoreManagementProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<StoreForm>(emptyStore);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startCreate = () => {
    setEditingName(null);
    setIsCreating(true);
    setForm(emptyStore);
  };

  const startEdit = (store: Store) => {
    setIsCreating(false);
    setEditingName(store.name);
    setForm({ id: store.id, name: store.name, displayOrder: store.displayOrder ?? 0 });
  };

  const cancel = () => {
    setEditingName(null);
    setIsCreating(false);
    setForm(emptyStore);
  };

  const saveNew = async () => {
    if (!form.name || savingName) return;
    setSavingName("__new__");
    try {
      await onCreateStore({ ...form, displayOrder: Number(form.displayOrder) || 0 });
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "店舗情報の登録に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const save = async () => {
    if (!editingName || !form.name || savingName) return;
    setSavingName(editingName);
    try {
      await onSaveStore(editingName, { ...form, displayOrder: Number(form.displayOrder) || 0 });
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "店舗情報の保存に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const remove = async (store: Store) => {
    const ok = window.confirm(`${store.name}を削除済みにします。関連する予約の店舗割当は未割当に戻ります。よろしいですか？`);
    if (!ok) return;
    try {
      await onDeleteStore(store.name);
      if (editingName === store.name) cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "店舗情報の削除に失敗しました");
    }
  };

  const reactivate = async (store: Store) => {
    if (!store.id || reactivatingId) return;
    setReactivatingId(store.id);
    try {
      await onReactivateStore(store);
    } catch (error) {
      notify(error instanceof Error ? error.message : "店舗情報の有効化に失敗しました");
    } finally {
      setReactivatingId(null);
    }
  };

  const renderFormCells = (mode: "create" | "edit", store?: Store) => {
    const target = mode === "create" ? "__new__" : store?.name;
    const isSaving = savingName === target;
    return (
      <>
        <td>
          <input className="order-input" aria-label="表示順" type="number" min={0} value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} />
        </td>
        <td>
          <input aria-label="店舗名" placeholder="店舗名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </td>
        <td>
          <span className="badge green"><i />有効</span>
        </td>
        <td>
          <div className="row-actions">
            <button type="button" disabled={isSaving} onClick={cancel}>キャンセル</button>
            <button type="button" className="save" disabled={!form.name || isSaving} onClick={mode === "create" ? saveNew : save}>
              {isSaving ? (mode === "create" ? "登録中" : "保存中") : (mode === "create" ? "登録" : "保存")}
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <section className="panel management-panel store-management">
      <div className="store-management-bar">
        <div>
          <strong>{stores.length}件</strong>
          <span>有効な店舗</span>
        </div>
        <div className="store-management-actions">
          {inactiveStores.length ? (
            <button type="button" className={showInactive ? "active" : ""} onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "削除済みを隠す" : `削除済みを表示 (${inactiveStores.length})`}
            </button>
          ) : null}
          <button type="button" className="primary" onClick={startCreate} disabled={isCreating}>
            <Icon name="plus" />
            新規登録
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="large-table store-table">
          <thead>
            <tr>
              <th>表示順</th>
              <th>店舗名</th>
              <th>状態</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isCreating ? <tr className="editing-row new-store-row">{renderFormCells("create")}</tr> : null}
            {stores.map((store) =>
              editingName === store.name ? (
                <tr key={`${store.name}-edit`} className="editing-row">{renderFormCells("edit", store)}</tr>
              ) : (
                <tr key={store.id ?? store.name}>
                  <td>{store.displayOrder ?? 0}</td>
                  <td><strong>{store.name}</strong></td>
                  <td><span className="badge green"><i />有効</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(store)}>編集</button>
                      <button type="button" className="danger" onClick={() => remove(store)}>削除</button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {!stores.length && !isCreating ? <div className="empty-table">有効な店舗はありません。</div> : null}
      </div>

      {showInactive && inactiveStores.length ? (
        <div className="inactive-store-section">
          <div className="subsection-head">
            <div>
              <h3>削除済み店舗</h3>
              <p>必要な店舗だけ有効に戻せます。</p>
            </div>
            <span>{inactiveStores.length}件</span>
          </div>
          <div className="table-wrap">
            <table className="large-table store-table inactive-table">
              <thead>
                <tr>
                  <th>表示順</th>
                  <th>店舗名</th>
                  <th>状態</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inactiveStores.map((store) => (
                  <tr key={store.id ?? `${store.name}-inactive`}>
                    <td>{store.displayOrder ?? 0}</td>
                    <td><strong>{store.name}</strong></td>
                    <td><span className="badge gray"><i />削除済み</span></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="save" disabled={!store.id || reactivatingId === store.id} onClick={() => reactivate(store)}>
                          {reactivatingId === store.id ? "有効化中" : "有効にする"}
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
