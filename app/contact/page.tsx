import { ContactForm } from "@/components/inquiries/contact-form";
export default async function Page({searchParams}:{searchParams:Promise<{reservation?:string|string[]}>}) {
  const value=(await searchParams).reservation;
  return <ContactForm reservationNumber={typeof value === "string" ? value : undefined}/>;
}
