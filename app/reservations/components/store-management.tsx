"use client";
import { CatalogManagement } from "./catalog-management";
import type { Store, StoreForm } from "../types";
type Props = {
  stores: Store[]; inactiveStores: Store[];
  onCreateStore: (input: StoreForm) => Promise<void>;
  onSaveStore: (name: string, input: StoreForm) => Promise<void>;
  onDeleteStore: (name: string) => Promise<void>;
  onReactivateStore: (store: Store) => Promise<void>;
  notify: (message: string) => void;
};
export function StoreManagement({ stores, inactiveStores, onCreateStore, onSaveStore, onDeleteStore, onReactivateStore }: Props) {
  return <CatalogManagement kind="store" items={stores} inactive={inactiveStores} onSave={async (values, original) => {
    const input = { id: original?.id, name: values.name, displayOrder: values.displayOrder, capacity: undefined };
    if (original) await onSaveStore(original.name, input); else await onCreateStore(input);
  }} onDisable={item => onDeleteStore(item.name)} onEnable={onReactivateStore} />;
}
