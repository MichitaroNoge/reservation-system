import { randomUUID } from "node:crypto";
import { mock } from "node:test";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../lib/auth";
import { getDatabase } from "../lib/db/client";
import { InquiryRepository } from "../lib/inquiries/repository";
import { InquiryReplyTemplateRepository } from "../lib/inquiries/reply-template-repository";
import type { ReservationRepository } from "../lib/repositories/reservation-repository";

/** Extra UI states in the existing ephemeral PGlite fixture; never imported by the app. */
export async function seedVisualAudit(repository: ReservationRepository) {
  if (process.env.APP_ENV !== "test" || process.env.DB_TEST_DRIVER !== "pglite") throw new Error("Visual audit requires isolated PGlite.");
  process.env.INQUIRY_FORM_SECRET = "visual-audit-only-secret-32-characters";
  const user = mock.method(getAuth(getFirebaseAdminApp()), "getUser", async (uid: string) => ({
    uid, email: "member@example.test", emailVerified: true, disabled: false, customClaims: {},
    providerData: [{ providerId: "password", uid, email: "member@example.test" }],
  }) as UserRecord);
  const account = await repository.findAccountByFirebaseUid("calendar-test-user");
  if (!account?.id) throw new Error("Missing visual fixture account.");
  await repository.updateAccount(account.id, { name: "表示確認のお客様（長い名称・団体窓口）", contact: "member@example.test", phone: "09000000000", address: "架空県架空市 テスト用の長い住所 ビル名・階数まで含む表示確認" });
  const original = { date: "2099-12-15", startTime: "19:15", endTime: "20:15", people: 8, name: "長い予約者名の表示確認のお客様", email: "member@example.test", phone: "09000000000", accountFirebaseUid: "calendar-test-user", menuItems: ["検証メニュー"], remarks: "折り返しを確認するための架空の長文です。".repeat(8) };
  for (const status of ["temporary_confirmed", "confirmed", "cancellation_requested", "confirmed_requested", "visited", "confirmed_rejected"] as const) {
    const booking = await repository.createReservation({ ...original, status, ...(status === "confirmed_requested" ? { requestType: "confirmed_from_temporary" as const } : {}) });
    if (status === "confirmed") await repository.createApprovalEmailDelivery({ deliveryKey: "visual-stopped-notice", reservationId: booking.id, type: "reservation_approved", requestedAt: new Date().toISOString() });
  }
  const menu = await repository.createMenu({ name: "長い名称の食事メニュー（食物アレルギー対応・団体向け）", description: "内容・提供時間についての長い説明文の折り返しを確認します。".repeat(3), price: 12345, duration: "90分", displayOrder: 2 });
  const store = await repository.createStore({ name: "長い店舗名の表示確認（別館・団体向け個室）", displayOrder: 2 });
  await repository.createMenu({ name: "無効メニューの確認", description: "", price: 0, duration: "0分", displayOrder: 3 });
  await repository.deleteMenu("無効メニューの確認");
  const db = await getDatabase(), inquiries = new InquiryRepository(db);
  for (const category of ["other", "service", "availability"] as const) {
    await inquiries.create({ name: "問い合わせ表示確認", email: "member@example.test", category, subject: "長い問い合わせ件名の折り返し・表示確認について", body: "日本語の長い本文とURLの折り返しを確認します。\nhttps://example.test/" + "very-long-path-segment".repeat(6), requestKey: randomUUID(), ...(category === "availability" ? { mealDate: "2099-12-15", mealStartTime: "19:15", people: 8 } : {}) }, "visual-audit", "calendar-test-user", null, []);
  }
  await new InquiryReplyTemplateRepository(db).create({ id: randomUUID(), name: "長い問い合わせ回答テンプレート名の表示確認", body: "お問い合わせありがとうございます。\nご利用についてのご案内です。", isActive: true });
  console.log("Visual-only synthetic states seeded", { menu: menu.name, store: store.name });
  return () => user.mock.restore();
}
