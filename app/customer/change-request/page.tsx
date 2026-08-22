import { redirect } from "next/navigation";

export default function CustomerChangeRequestPage() {
  redirect("/?customerMode=change");
}
