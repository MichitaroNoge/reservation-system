import { redirect } from "next/navigation";

export default function CustomerReservationsPage() {
  redirect("/?customerMode=account");
}
