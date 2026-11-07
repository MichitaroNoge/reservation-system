import type { Store, StoreAssignment } from "../types";

/** Options shared by the assignment editors; each row excludes stores selected elsewhere. */
export function StoreAssignmentOptions({ stores, assignments, index }: { stores: Store[]; assignments: StoreAssignment[]; index: number }) {
  const selected = assignments[index]?.store ?? "";
  return <>
    <option value="">店舗を選択</option>
    {selected && !stores.some(store => store.name === selected) && <option value={selected}>{selected}（現在の割当）</option>}
    {stores.map(store => <option key={store.name} value={store.name} disabled={assignments.some((assignment, otherIndex) => otherIndex !== index && assignment.store === store.name) && selected !== store.name}>{store.name}</option>)}
  </>;
}
