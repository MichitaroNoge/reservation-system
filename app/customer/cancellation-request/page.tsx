import { redirect } from "next/navigation";

export default function CustomerCancellationRequestPage() {
  redirect("/?customerMode=cancellation");
}
