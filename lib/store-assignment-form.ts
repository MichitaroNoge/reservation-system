import { z } from "zod";
import type { Store, StoreAssignment } from "../app/reservations/types";

/** Include saved inactive stores, and preserve input when the active catalog refreshes. */
export function storeAssignmentRows(stores: Store[], saved: StoreAssignment[], draft?: StoreAssignment[]): StoreAssignment[] {
  const names = [...new Set([
    ...[...stores].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)).map(store => store.name),
    ...saved.map(assignment => assignment.store),
    ...(draft ?? []).map(assignment => assignment.store),
  ])];
  const amounts = new Map<string, number>();
  for (const assignment of draft ?? saved) amounts.set(assignment.store, (amounts.get(assignment.store) ?? 0) + assignment.people);
  return names.map(store => ({ store, people: amounts.get(store) ?? 0 }));
}

export function storeAssignmentFormSchema(stores: Store[], saved: StoreAssignment[], people: number, allowUnassigned = false) {
  const allowed = new Set([...stores.map(store => store.name), ...saved.map(assignment => assignment.store)]);
  return z.object({ assignments: z.array(z.object({
    store: z.string(),
    people: z.number({ error: "人数を確認してください。" }).int("整数で入力してください。").min(0, "0名以上を入力してください。").max(Math.min(people, 999), `${Math.min(people, 999)}名以下を入力してください。`),
  })) }).superRefine((value, ctx) => {
    const selected = value.assignments.filter(assignment => assignment.people > 0);
    value.assignments.forEach((assignment, index) => {
      if (assignment.people > 0 && !allowed.has(assignment.store)) ctx.addIssue({ code: "custom", path: ["assignments", index, "people"], message: "この店舗は現在割り当てできません。0名に戻してください。" });
      if (assignment.people > 0 && value.assignments.slice(0, index).some(other => other.store === assignment.store && other.people > 0)) ctx.addIssue({ code: "custom", path: ["assignments", index, "people"], message: "同じ店舗は複数行に割り当てられません。" });
    });
    if (selected.length > 50) ctx.addIssue({ code: "custom", path: ["assignments", "root"], message: "割当先は50店舗以内にしてください。" });
    const total = selected.reduce((sum, assignment) => sum + assignment.people, 0);
    if ((!allowUnassigned || selected.length > 0) && total !== people) ctx.addIssue({ code: "custom", path: ["assignments", "root"], message: `割当合計を予約人数${people}名に合わせてください。` });
  }).transform(value => ({ assignments: value.assignments.filter(assignment => assignment.people > 0) }));
}
