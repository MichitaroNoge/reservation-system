import type { Account, CreateReservationChangeRequestInput, CreateReservationInput, Menu, Reservation, ReservationChangeRequest, ReservationRequestType, ReservationStatus, SaveAccountInput, SaveMenuInput, SaveStoreInput, Store, StoreAssignment, UpdateReservationInput } from "../domain";

export type ReservationRepository = {
  listReservations(): Promise<Reservation[]>;
  listReservationsForReservationAccount(firebaseUid: string): Promise<Reservation[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  updateReservation(id: string, input: UpdateReservationInput): Promise<Reservation>;
  updateReservationStatus(id: string, status: ReservationStatus, options?: { requestType?: ReservationRequestType | null }): Promise<Reservation>;
  updateConfirmationContact(id: string, contactedAt: string | null): Promise<Reservation>;
  assignStores(id: string, assignments: StoreAssignment[]): Promise<Reservation>;
  listReservationChangeRequests(): Promise<ReservationChangeRequest[]>;
  createReservationChangeRequest(input: CreateReservationChangeRequestInput): Promise<ReservationChangeRequest>;
  approveReservationChangeRequest(id: string): Promise<{ request: ReservationChangeRequest; reservation: Reservation }>;
  rejectReservationChangeRequest(id: string): Promise<ReservationChangeRequest>;

  listAccounts(): Promise<Account[]>;
  listInactiveAccounts(): Promise<Account[]>;
  findAccountByFirebaseUid(firebaseUid: string): Promise<Account | null>;
  createAccount(input: SaveAccountInput & { firebaseUid: string }): Promise<Account>;
  updateAccount(id: string, input: SaveAccountInput): Promise<Account>;
  deactivateAccount(id: string): Promise<void>;
  reactivateAccount(id: string): Promise<Account>;

  listStores(): Promise<Store[]>;
  listInactiveStores(): Promise<Store[]>;
  createStore(input: SaveStoreInput): Promise<Store>;
  updateStore(name: string, input: SaveStoreInput): Promise<Store>;
  deleteStore(name: string): Promise<void>;
  reactivateStore(id: string): Promise<Store>;
  listMenus(): Promise<Menu[]>;
  listInactiveMenus(): Promise<Menu[]>;
  createMenu(input: SaveMenuInput): Promise<Menu>;
  updateMenu(name: string, input: SaveMenuInput): Promise<Menu>;
  deleteMenu(name: string): Promise<void>;
  reactivateMenu(id: string): Promise<Menu>;
};
