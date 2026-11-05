"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
    const ok = window.confirm(`${menu.name}を新規選択肢から削除します。既存予約のメニューと金額は保持されます。よろしいですか？`);
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
        <TableCell>
          <Input className="w-20" aria-label="表示順" type="number" min={0} value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} />
        </TableCell>
        <TableCell>
          <Input aria-label="メニュー名" placeholder="メニュー名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </TableCell>
        <TableCell>
          <Input aria-label="説明" placeholder="説明" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </TableCell>
        <TableCell>
          <Input aria-label="金額" type="number" min={0} value={form.price || ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} />
        </TableCell>
        <TableCell>
          <Input aria-label="利用時間" type="number" min={0} value={durationMinutes(form.duration)} onChange={(event) => setForm({ ...form, duration: durationFromMinutes(Number(event.target.value)) })} />
        </TableCell>
        <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={cancel}>キャンセル</Button>
            <Button type="button" size="sm" disabled={!form.name || form.price < 0 || isSaving} onClick={() => submit(mode)}>
              {isSaving ? (mode === "create" ? "登録中" : "保存中") : (mode === "create" ? "登録" : "保存")}
            </Button>
          </div>
        </TableCell>
      </>
    );
  };

  return (
    <ListPanel>
      <ListToolbar>
        <ResultCount count={menus.length} />
        <div className="flex gap-2">
          {inactiveMenus.length ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "削除済みを隠す" : `削除済みを表示 (${inactiveMenus.length})`}
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={startCreate} disabled={isCreating}>
            <Icon name="plus" />
            新規登録
          </Button>
        </div>
      </ListToolbar>

      <div className="table-wrap">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>表示順</TableHead>
              <TableHead>メニュー名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>利用時間</TableHead>
              <TableHead className="sticky right-0 bg-background">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCreating ? <TableRow className="editing-row new-menu-row">{renderFormCells("create")}</TableRow> : null}
            {menus.map((menu) =>
              editingName === menu.name ? (
                <TableRow key={`${menu.name}-edit`} className="editing-row">{renderFormCells("edit", menu)}</TableRow>
              ) : (
                <TableRow key={menu.name}>
                  <TableCell>{menu.displayOrder ?? 0}</TableCell>
                  <TableCell><strong>{menu.name}</strong></TableCell>
                  <TableCell>{menu.description || "-"}</TableCell>
                  <TableCell><strong>{"¥"}{menu.price.toLocaleString()}</strong></TableCell>
                  <TableCell>{durationLabel(menu.duration)}</TableCell>
                  <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(menu)}>編集</Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(menu)}>削除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
        {!menus.length && !isCreating ? <EmptyState title="登録済みメニューはありません" /> : null}
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
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>表示順</TableHead>
                  <TableHead>メニュー名</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>利用時間</TableHead>
                  <TableHead className="sticky right-0 bg-background">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveMenus.map((menu) => (
                  <TableRow key={menu.id ?? `${menu.name}-inactive`}>
                    <TableCell>{menu.displayOrder ?? 0}</TableCell>
                    <TableCell><strong>{menu.name}</strong></TableCell>
                    <TableCell>{menu.description || "-"}</TableCell>
                    <TableCell><strong>{"¥"}{menu.price.toLocaleString()}</strong></TableCell>
                    <TableCell>{durationLabel(menu.duration)}</TableCell>
                    <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={!menu.id || reactivatingId === menu.id} onClick={() => reactivate(menu)}>
                          {reactivatingId === menu.id ? "有効化中" : "有効にする"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </ListPanel>
  );
}
