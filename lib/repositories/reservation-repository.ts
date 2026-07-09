import type { CreateReservationInput, Customer, Menu, Reservation, ReservationStatus, SaveMenuInput, Store, UpdateReservationInput } from "../domain";

export type ReservationRepository = {
  listReservations(): Promise<Reservation[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  updateReservation(id: string, input: UpdateReservationInput): Promise<Reservation>;
  updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation>;
  assignStore(id: string, store: string): Promise<Reservation>;
  listCustomers(): Promise<Customer[]>;
  listStores(): Promise<Store[]>;
  listMenus(): Promise<Menu[]>;
  createMenu(input: SaveMenuInput): Promise<Menu>;
  updateMenu(name: string, input: SaveMenuInput): Promise<Menu>;
  deleteMenu(name: string): Promise<void>;
};
