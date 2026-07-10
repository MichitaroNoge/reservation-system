import type { CreateReservationInput, Customer, Menu, Reservation, ReservationStatus, SaveCustomerInput, SaveMenuInput, SaveStoreInput, Store, StoreAssignment, UpdateReservationInput } from "../domain";

export type ReservationRepository = {
  listReservations(): Promise<Reservation[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  updateReservation(id: string, input: UpdateReservationInput): Promise<Reservation>;
  updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation>;
  updateConfirmationContact(id: string, contactedAt: string | null): Promise<Reservation>;
  assignStores(id: string, assignments: StoreAssignment[]): Promise<Reservation>;
  listCustomers(): Promise<Customer[]>;
  updateCustomer(name: string, input: SaveCustomerInput): Promise<Customer>;
  deleteCustomer(name: string): Promise<void>;
  listStores(): Promise<Store[]>;
  updateStore(name: string, input: SaveStoreInput): Promise<Store>;
  deleteStore(name: string): Promise<void>;
  listMenus(): Promise<Menu[]>;
  createMenu(input: SaveMenuInput): Promise<Menu>;
  updateMenu(name: string, input: SaveMenuInput): Promise<Menu>;
  deleteMenu(name: string): Promise<void>;
};
