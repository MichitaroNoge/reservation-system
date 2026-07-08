import type { CreateReservationInput, Customer, Menu, Reservation, ReservationStatus, Store } from "../domain";

export type ReservationRepository = {
  listReservations(): Promise<Reservation[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  updateReservationStatus(id: string, status: ReservationStatus): Promise<Reservation>;
  assignStore(id: string, store: string): Promise<Reservation>;
  listCustomers(): Promise<Customer[]>;
  listStores(): Promise<Store[]>;
  listMenus(): Promise<Menu[]>;
};
