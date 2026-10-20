import { adminInquiries } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
export function GET(request:Request){return adminInquiries(request);}
