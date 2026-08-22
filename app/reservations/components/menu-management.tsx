"use client";

import { useState } from "react";
import { Icon } from "./common";
import type { Menu, MenuForm } from "../types";

type MenuManagementProps = {
  menus: Menu[];
  inactiveMenus: Menu[];
  onSaveMenu: (input: MenuForm, originalName?: string) => Promise<void>;
  onDeleteMenu: (name: string) => Promise<void>;
  onReactivateMenu: (menu: Menu) => Promise<void>;
  notify: (message: string) => void;
};

const emptyForm: MenuForm = { name: "", description: "", price: 0, duration: "45分", displayOrder: 0 };

function durationMinutes(duration: string) {
  if (duration === "来店後") return 0;
  const match = duration.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function durationLabel(duration: string) {
  const minutes = durationMinutes(duration);
  return minutes > 0 ? `${minutes}分` : "来店後";
}

function durationFromMinutes(minutes: number) {
  return minutes > 0 ? `${minutes}分` : "来店後";
}

export function MenuManagement({ menus, inactiveMenus, onSaveMenu, onDeleteMenu, onReactivateMenu, notify }: MenuManagementProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const startCreate = () => {
    setEditingName(null);
    setIsCreating(true);
    setForm(emptyForm);
  };

  const startEdit = (menu: Menu) => {
    setIsCreating(false);
    setEditingName(menu.name);
    setForm({ ...menu, duration: menu.duration || "来店後", displayOrder: menu.displayOrder ?? 0 });
  };

  const cancel = () => {
    setEditingName(null);
    setIsCreating(false);
    setForm(emptyForm);
  };

  const submit = async (mode: "create" | "edit") => {
    if (!form.name || form.price < 0 || savingName) return;
    const target = mode === "create" ? "__new__" : editingName;
    if (!target) return;
    setSavingName(target);
    try {
      await onSaveMenu(
        { ...form, duration: durationLabel(form.duration || "45分"), displayOrder: Number(form.displayOrder) || 0 },
        mode === "edit" ? editingName ?? undefined : undefined,
      );
      cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "メニュー情報の保存に失敗しました");
    } finally {
      setSavingName(null);
    }
  };

  const remove = async (menu: Menu) => {
    const ok = window.confirm(`${menu.name}を削除します。関連する予約の金額も再計算されます。よろしいですか？`);
    if (!ok) return;
    try {
      await onDeleteMenu(menu.name);
      if (editingName === menu.name) cancel();
    } catch (error) {
      notify(error instanceof Error ? error.message : "メニュー情報の削除に失敗しました");
    }
  };

  const reactivate = async (menu: Menu) => {
    if (!menu.id || reactivatingId) return;
    setReactivatingId(menu.id);
    try {
      await onReactivateMenu(menu);
    } catch (error) {
      notify(error instanceof Error ? error.message : "メニュー情報の有効化に失敗しました");
    } finally {
      setReactivatingId(null);
    }
  };

  const renderFormCells = (mode: "create" | "edit", menu?: Menu) => {
    const target = mode === "create" ? "__new__" : menu?.name;
    const isSaving = savingName === target;
    return (
      <>
        <td>
          <input className="order-input" aria-label="表示順" type="number" min={0} value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} />
        </td>
        <td>
          <input aria-label="メニュー名" placeholder="メニュー名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </td>
        <td>
          <input aria-label="説明" placeholder="説明" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </td>
        <td>
          <input aria-label="金額" type="number" min={0} value={form.price || ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} />
        </td>
        <td>
          <input aria-label="利用時間" type="number" min={0} value={durationMinutes(form.duration)} onChange={(event) => setForm({ ...form, duration: durationFromMinutes(Number(event.target.value)) })} />
        </td>
        <td>
          <div className="row-actions">
            <button type="button" disabled={isSaving} onClick={cancel}>キャンセル</button>
            <button type="button" className="save" disabled={!form.name || form.price < 0 || isSaving} onClick={() => submit(mode)}>
              {isSaving ? (mode === "create" ? "登録中" : "保存中") : (mode === "create" ? "登録" : "保存")}
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <section className="panel management-panel menu-management">
      <div className="menu-management-bar">
        <div>
          <strong>{menus.length}件</strong>
        </div>
        <div className="menu-management-actions">
          {inactiveMenus.length ? (
            <button type="button" className={showInactive ? "active" : ""} onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "削除済みを隠す" : `削除済みを表示 (${inactiveMenus.length})`}
            </button>
          ) : null}
          <button type="button" className="primary" onClick={startCreate} disabled={isCreating}>
            <Icon name="plus" />
            新規登録
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="large-table menu-table">
          <thead>
            <tr>
              <th>表示順</th>
              <th>メニュー名</th>
              <th>説明</th>
              <th>金額</th>
              <th>利用時間</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isCreating ? <tr className="editing-row new-menu-row">{renderFormCells("create")}</tr> : null}
            {menus.map((menu) =>
              editingName === menu.name ? (
                <tr key={`${menu.name}-edit`} className="editing-row">{renderFormCells("edit", menu)}</tr>
              ) : (
                <tr key={menu.name}>
                  <td>{menu.displayOrder ?? 0}</td>
                  <td><strong>{menu.name}</strong></td>
                  <td>{menu.description || "-"}</td>
                  <td><strong>{"¥"}{menu.price.toLocaleString()}</strong></td>
                  <td>{durationLabel(menu.duration)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(menu)}>編集</button>
                      <button type="button" className="danger" onClick={() => remove(menu)}>削除</button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {!menus.length && !isCreating ? <div className="empty-table">登録済みメニューはありません。</div> : null}
      </div>

      {showInactive && inactiveMenus.length ? (
        <div className="inactive-menu-section">
          <div className="subsection-head">
            <div>
              <h3>削除済みメニュー</h3>
            </div>
            <span>{inactiveMenus.length}件</span>
          </div>
          <div className="table-wrap">
            <table className="large-table menu-table inactive-table">
              <thead>
                <tr>
                  <th>表示順</th>
                  <th>メニュー名</th>
                  <th>説明</th>
                  <th>金額</th>
                  <th>利用時間</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inactiveMenus.map((menu) => (
                  <tr key={menu.id ?? `${menu.name}-inactive`}>
                    <td>{menu.displayOrder ?? 0}</td>
                    <td><strong>{menu.name}</strong></td>
                    <td>{menu.description || "-"}</td>
                    <td><strong>{"¥"}{menu.price.toLocaleString()}</strong></td>
                    <td>{durationLabel(menu.duration)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="save" disabled={!menu.id || reactivatingId === menu.id} onClick={() => reactivate(menu)}>
                          {reactivatingId === menu.id ? "有効化中" : "有効にする"}
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
