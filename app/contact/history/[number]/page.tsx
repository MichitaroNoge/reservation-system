import {ContactHistory} from "@/components/inquiries/contact-history";
export default async function Page({params}:{params:Promise<{number:string}>}){return <ContactHistory number={(await params).number}/>;}
