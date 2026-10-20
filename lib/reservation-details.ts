import { ApiValidationError } from "./api-validation";

type ExistingDetail = { menuId: string; quantity: number; unitPrice: number };
type CatalogMenu = { id: string; name: string; price: number; active: boolean };

/** Existing selections keep the booked price, including menus removed from the catalog. */
export function planReservationDetails(existing: ExistingDetail[], catalog: CatalogMenu[], names: string[]) {
  const prices = new Map<string, number[]>();
  for (const detail of existing) {
    const values = prices.get(detail.menuId) ?? [];
    values.push(...Array(detail.quantity).fill(detail.unitPrice));
    prices.set(detail.menuId, values);
  }
  return names.map(name => {
    const menu = catalog.find(item => item.name === name);
    if (!menu) throw new ApiValidationError(`メニュー「${name}」が見つかりません。選択内容を確認してください。`);
    const previousPrice = prices.get(menu.id)?.shift();
    if (!menu.active && previousPrice === undefined) throw new ApiValidationError(`メニュー「${name}」は現在選択できません。`);
    return { menuId: menu.id, quantity: 1, unitPrice: previousPrice ?? menu.price };
  });
}
