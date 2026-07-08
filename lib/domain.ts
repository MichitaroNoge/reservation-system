export type ReservationStatus =
  | "仮予約申請中"
  | "仮予約確定"
  | "本予約申請中"
  | "本予約確定"
  | "来店待ち"
  | "来店済"
  | "キャンセル申請中"
  | "キャンセル確定";

export type Reservation = {
  id: string;
  customer: string;
  email?: string;
  date: string;
  people: number;
  menu?: string;
  menuItems: string[];
  totalAmount: number;
  store: string | null;
  status: ReservationStatus;
  received: string;
  phone: string;
};

export type Customer = {
  name: string;
  contact: string;
  phone: string;
  count: number;
  last: string;
};

export type Store = {
  name: string;
  area: string;
  today: number;
  month: number;
  state: string;
};

export type Menu = {
  name: string;
  description: string;
  price: number;
  duration: string;
};

export type CreateReservationInput = {
  menu?: string;
  menuItems?: string[];
  date: string;
  people: number;
  name: string;
  email: string;
  phone: string;
};

export type SaveMenuInput = Menu;
