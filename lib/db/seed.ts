import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { ReservationDatabase } from "../repositories/drizzle-reservation-repository";
import { seedMenus, seedReservations, seedStores } from "../seed-data";
import { defaultEmailTemplates } from "../email/email-template-catalog";
import { toDataConnectReservationStatus } from "../domain";
import * as s from "./schema";

function seedId(value: string) {
  const hex = createHash("sha256").update(`reservation-system-local-seed:${value}`).digest("hex").slice(0,32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20)}`;
}

/** Idempotent: existing records (including edited templates) are never overwritten. Sends no email. */
export async function seedDatabase(db: ReservationDatabase, firebaseUid?: string) {
  await db.transaction(async tx => {
    const storeIds = new Map<string,string>();
    const menuIds = new Map<string,{ id: string; price: number }>();
    for (const store of seedStores) {
      const existing = await tx.query.store.findFirst({ where: eq(s.store.name, store.name) });
      const id = existing?.id ?? seedId(`store:${store.name}`);
      if (!existing) await tx.insert(s.store).values({ id, name: store.name, displayOrder: store.displayOrder }).onConflictDoNothing();
      storeIds.set(store.name,id);
    }
    for (const menu of seedMenus) {
      const existing = await tx.query.menu.findFirst({ where: eq(s.menu.name, menu.name) });
      const id = existing?.id ?? seedId(`menu:${menu.name}`);
      if (!existing) await tx.insert(s.menu).values({ id, name: menu.name, description: menu.description, standardPrice: menu.price, durationMinutes: Number(menu.duration.match(/\d+/)?.[0] ?? 0), displayOrder: menu.displayOrder }).onConflictDoNothing();
      menuIds.set(menu.name,{ id, price: existing?.standardPrice ?? menu.price });
    }
    for (const template of defaultEmailTemplates()) {
      await tx.insert(s.emailTemplate).values({ id: seedId(`template:${template.templateKey}`), templateKey: template.templateKey, name: template.name, subject: template.subject, body: template.body, isActive: template.isActive }).onConflictDoNothing();
    }
    const uid = firebaseUid ?? "local-seed-user-not-a-firebase-login";
    await tx.insert(s.account).values({ id: seedId(`account:${uid}`), firebaseUid: uid, name: "開発用サンプルアカウント", email: "developer@example.test", phone: "000-0000-0000" }).onConflictDoNothing();
    const account = await tx.query.account.findFirst({ where: eq(s.account.firebaseUid, uid) });
    await tx.insert(s.customer).values({ id: seedId("legacy-customer"), name: "旧顧客サンプル", phone: "000-0000-0000", email: "legacy@example.test" }).onConflictDoNothing();
    for (const reservation of seedReservations) {
      const existing = await tx.query.reservation.findFirst({ where: eq(s.reservation.reservationCode, reservation.id) });
      if (existing) continue;
      const id = seedId(`reservation:${reservation.id}`);
      await tx.insert(s.reservation).values({ id, reservationCode: reservation.id, accountId: account?.id,
        reserverName: reservation.customer, reserverEmail: reservation.email, reserverPhone: reservation.phone, reserverAddress: reservation.address,
        usageDate: reservation.date, usageTime: reservation.startTime ?? "10:00", usageEndTime: reservation.endTime, expectedPeople: reservation.people,
        status: toDataConnectReservationStatus(reservation.status), bookingType: reservation.bookingType ?? "individual", paymentCondition: reservation.paymentCondition ?? "onsite_cash", remarks: reservation.remarks,
        confirmationContactedAt: reservation.confirmationContactedAt,
        // Legacy UI fixtures have non-ISO received values; use a deterministic valid timestamp.
        receivedAt: "2026-07-01T00:00:00.000Z",
      });
      for (const [index, name] of reservation.menuItems.entries()) {
        const menu = menuIds.get(name);
        if (menu) await tx.insert(s.reservationDetail).values({ id: seedId(`detail:${id}:${index}`), reservationId:id, menuId:menu.id, quantity:1, unitPrice:menu.price });
      }
      for (const [index, assignment] of (reservation.storeAssignments ?? []).entries()) {
        const storeId=storeIds.get(assignment.store);
        if (storeId) await tx.insert(s.storeAssignment).values({ id:seedId(`assignment:${id}:${index}`), reservationId:id, storeId, people:assignment.people });
      }
    }
  });
}
