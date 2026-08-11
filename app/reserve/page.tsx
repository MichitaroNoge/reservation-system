import { redirect } from "next/navigation";

export default function ReservePage() {
  redirect("/?customerMode=reservation");
}
