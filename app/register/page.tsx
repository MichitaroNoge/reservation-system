import type { Metadata } from "next";
import ReservationApp from "../page";

export const metadata: Metadata = { title: "新規登録 | 団体予約" };

export default function RegisterPage() {
  return <ReservationApp key="customer-register" />;
}
