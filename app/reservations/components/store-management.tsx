"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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

const emptyStore: StoreForm = { name: "", displayOrder: 0, capacity: undefined };

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
    setForm({ id: store.id, name: store.name, displayOrder: store.displayOrder ?? 0, capacity: undefined });
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
    const ok = window.confirm(`${store.name}を新規選択肢から削除します。既存予約の店舗割当は保持されます。よろしいですか？`);
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
        <TableCell>
          <Input className="w-20" aria-label="表示順" type="number" min={0} value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} />
        </TableCell>
        <TableCell>
          <Input aria-label="店舗名" placeholder="店舗名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </TableCell>
        <TableCell>
          <Badge variant="success">有効</Badge>
        </TableCell>
        <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={cancel}>キャンセル</Button>
            <Button type="button" size="sm" disabled={!form.name || isSaving} onClick={mode === "create" ? saveNew : save}>
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
        <ResultCount count={stores.length} />
        <div className="flex gap-2">
          {inactiveStores.length ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInactive((current) => !current)}>
              {showInactive ? "削除済みを隠す" : `削除済みを表示 (${inactiveStores.length})`}
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={startCreate} disabled={isCreating}>
            <Icon name="plus" />
            新規登録
          </Button>
        </div>
      </ListToolbar>

      <div className="table-wrap">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>表示順</TableHead>
              <TableHead>店舗名</TableHead>

              <TableHead>状態</TableHead>
              <TableHead className="sticky right-0 bg-background">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCreating ? <TableRow className="editing-row new-store-row">{renderFormCells("create")}</TableRow> : null}
            {stores.map((store) =>
              editingName === store.name ? (
                <TableRow key={`${store.name}-edit`} className="editing-row">{renderFormCells("edit", store)}</TableRow>
              ) : (
                <TableRow key={store.id ?? store.name}>
                  <TableCell>{store.displayOrder ?? 0}</TableCell>
                  <TableCell><strong>{store.name}</strong></TableCell>
                  <TableCell><Badge variant="success">有効</Badge></TableCell>
                  <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(store)}>編集</Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(store)}>削除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
        {!stores.length && !isCreating ? <EmptyState title="有効な店舗はありません" /> : null}
      </div>

      {showInactive && inactiveStores.length ? (
        <div className="inactive-store-section">
          <div className="subsection-head">
            <div>
              <h3>削除済み店舗</h3>
            </div>
            <span>{inactiveStores.length}件</span>
          </div>
          <div className="table-wrap">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>表示順</TableHead>
                  <TableHead>店舗名</TableHead>

                  <TableHead>状態</TableHead>
                  <TableHead className="sticky right-0 bg-background">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveStores.map((store) => (
                  <TableRow key={store.id ?? `${store.name}-inactive`}>
                    <TableCell>{store.displayOrder ?? 0}</TableCell>
                    <TableCell><strong>{store.name}</strong></TableCell>
                    <TableCell><Badge variant="secondary">削除済み</Badge></TableCell>
                    <TableCell className="sticky right-0 bg-card"><div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={!store.id || reactivatingId === store.id} onClick={() => reactivate(store)}>
                          {reactivatingId === store.id ? "有効化中" : "有効にする"}
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
