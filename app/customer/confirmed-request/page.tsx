import { redirect } from "next/navigation";

export default function CustomerConfirmedRequestPage() {
  redirect("/customer/reservations");
}
