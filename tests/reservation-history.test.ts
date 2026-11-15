import assert from "node:assert/strict";
import test from "node:test";
import { reservationSnapshot, requestedChangeSnapshot, matchesHistory, historyStatusLabel, historyActor, historyNotification, type ReservationHistory } from "../lib/reservation-history";
import { InMemoryReservationRepository } from "../lib/repositories/in-memory-reservation-repository";
import { requestHistory, finishHistory } from "../lib/services/reservation-history-service";

async function booking() {
  const repo = new InMemoryReservationRepository({ reservations: [], menus: [], stores: [] });
  return { repo, reservation: await repo.createReservation({ name: "履歴検証", email: "history@example.test", phone: "0000000000", date: "2099-01-01", startTime: "12:00", people: 15, menuItems: [], status: "temporary_confirmed" }) };
}
test("history snapshots retain submitted fields without live references or account ownership IDs", async () => {
  const { reservation } = await booking(); reservation.accountId = "private-account";
  reservation.menuItems = ["当時のメニュー"];
  const snapshot = reservationSnapshot(reservation);
  reservation.menuItems[0] = "現在のメニュー"; reservation.people = 20;
  assert.equal(snapshot.people, 15); assert.deepEqual(snapshot.menuItems, ["当時のメニュー"]);
  assert.equal("accountId" in snapshot, false);
});
test("requested changes do not fabricate an end time or price for a changed menu", async () => {
  const { reservation } = await booking();
  const snapshot = requestedChangeSnapshot(reservation, { requestedDate: reservation.date, requestedStartTime: "13:00", requestedPeople: 16, requestedMenuItems: ["別メニュー"] });
  assert.equal(snapshot.people, 16); assert.equal(snapshot.endTime, undefined); assert.equal(snapshot.totalAmount, undefined);
  assert.equal(reservation.people, 15);
});
test("duplicate requests retain the first snapshot and a rejected conversion can be requested again", async () => {
  const { repo, reservation } = await booking();
  const actor = historyActor({ uid: "customer" }, "customer");
  const first = await requestHistory(repo, reservation, { kind: "confirmed_conversion", actor });
  assert.ok(first);
  reservation.people = 16;
  assert.equal((await requestHistory(repo, reservation, { kind: "confirmed_conversion", actor }))?.id, first.id);
  assert.equal((await repo.listReservationHistory())[0].requested?.people, 15);
  await finishHistory(repo, reservation, reservation, { kind: "confirmed_conversion", status: "rejected", actor: historyActor({ uid: "admin" }, "admin") });
  const next = await requestHistory(repo, reservation, { kind: "confirmed_conversion", actor });
  assert.notEqual(next?.id, first.id);
  assert.equal((await repo.listReservationHistory()).length, 2);
});
test("history filters use Japan dates and distinguish unknown legacy records from approvals", async () => {
  const { repo, reservation } = await booking();
  const row = (await requestHistory(repo, reservation, { kind: "reservation", actor: null }))!;
  const processed: ReservationHistory = { ...row, status: "approved", processedAt: "2026-11-10T15:00:00.000Z" };
  const query = { keyword: "", from: "2026-11-11", to: "2026-11-11", page: 1, pageSize: 20 };
  assert.equal(matchesHistory(processed, query), true);
  assert.equal(matchesHistory({ ...processed, processedAt: "2026-11-10T14:59:59.999Z" }, query), false);
  assert.equal(matchesHistory(row, { ...query, from: undefined, to: undefined }), false);
  assert.equal(matchesHistory(row, { keyword: "", reservationId: row.reservationCode, page: 1, pageSize: 20 }), true);
  assert.equal(historyStatusLabel({ kind: "confirmed_conversion", status: "unknown" }), "処理結果不明");
  assert.equal(historyStatusLabel({ kind: "cancellation", status: "approved" }), "キャンセル確定");
});
test("mail status uses the exact recorded notification identity rather than another approval cycle", async () => {
  const { repo, reservation } = await booking();
  const row = (await requestHistory(repo, reservation, { kind: "confirmed_conversion", actor: null }))!;
  const stamp = "2026-11-11T00:00:00.000Z";
  const entry: ReservationHistory = { ...row, status: "approved", processedAt: stamp, after: { status: "confirmed", notificationReference: { deliveryKey: "exact-key", requestedAt: stamp } } };
  const mail = { deliveryKey: "exact-key", reservationId: row.reservationCode, type: "confirmed_change_approved" as const, referenceId: "confirmed", requestedAt: stamp, retryCount: 0 };
  assert.equal(historyNotification(entry, [mail]).state, "pending");
  assert.equal(historyNotification(entry, [{ ...mail, sentAt: stamp }]).state, "sent");
  assert.equal(historyNotification(entry, [{ ...mail, lastError: "送信失敗" }]).state, "failed");
  assert.equal(historyNotification(entry, [{ ...mail, stoppedAt: stamp }]).state, "stopped");
  assert.equal(historyNotification(entry, [{ ...mail, requestedAt: "2026-11-12T00:00:00.000Z", sentAt: stamp }]).state, "unknown");
  assert.equal(historyNotification({ ...entry, after: { status: "confirmed" } }, [{ ...mail, sentAt: stamp }]).state, "unknown");
  assert.equal(historyNotification({ ...entry, status: "rejected" }, [mail]).state, "not_requested");
});
