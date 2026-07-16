import type { CreateReservationInput, ReservationStatus, SaveCustomerInput, SaveStoreInput, StoreAssignment, UpdateReservationInput } from "../domain";
import type { ReservationRepository } from "./reservation-repository";

/**
 * Firebase SQL Connect の生成SDKへ差し替えるための境界です。
 *
 * 現時点では Firebase Web App の apiKey と SQL Connect SDK の生成が未完了のため、
 * API は FileReservationRepository を利用します。`firebase dataconnect:sdk:generate`
 * 後、このクラスで `src/generated/dataconnect` の query/mutation を呼び出します。
 */
export class FirebaseSqlConnectReservationRepository implements ReservationRepository {
  private unavailable(): never {
    throw new Error("Firebase SQL Connect SDK is not generated yet.");
  }

  listReservations() {
    return this.unavailable();
  }

  createReservation(_input: CreateReservationInput) {
    return this.unavailable();
  }

  updateReservation(_id: string, _input: UpdateReservationInput) {
    return this.unavailable();
  }

  updateReservationStatus(_id: string, _status: ReservationStatus) {
    return this.unavailable();
  }

  updateConfirmationContact(_id: string, _contactedAt: string | null) {
    return this.unavailable();
  }

  assignStores(_id: string, _assignments: StoreAssignment[]) {
    return this.unavailable();
  }

  listCustomers() {
    return this.unavailable();
  }

  updateCustomer(_name: string, _input: SaveCustomerInput) {
    return this.unavailable();
  }

  deleteCustomer(_name: string) {
    return this.unavailable();
  }

  listStores() {
    return this.unavailable();
  }

  updateStore(_name: string, _input: SaveStoreInput) {
    return this.unavailable();
  }

  deleteStore(_name: string) {
    return this.unavailable();
  }

  listMenus() {
    return this.unavailable();
  }

  createMenu() {
    return this.unavailable();
  }

  updateMenu() {
    return this.unavailable();
  }

  deleteMenu() {
    return this.unavailable();
  }
}
