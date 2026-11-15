"use client";
import { CatalogManagement } from "./catalog-management";
import type { Menu, MenuForm } from "../types";
type Props = {
  menus: Menu[]; inactiveMenus: Menu[];
  onSaveMenu: (input: MenuForm, name?: string) => Promise<void>;
  onDeleteMenu: (name: string) => Promise<void>;
  onReactivateMenu: (menu: Menu) => Promise<void>;
  notify: (message: string) => void;
};
export function MenuManagement({ menus, inactiveMenus, onSaveMenu, onDeleteMenu, onReactivateMenu }: Props) {
  return <CatalogManagement kind="menu" items={menus} inactive={inactiveMenus} onSave={(values, original) => onSaveMenu({ id: original?.id, name: values.name, displayOrder: values.displayOrder, description: values.description, price: values.price, duration: values.minutes > 0 ? values.minutes + "分" : "来店後" }, original?.name)} onDisable={item => onDeleteMenu(item.name)} onEnable={item => onReactivateMenu(item as Menu)} />;
}
