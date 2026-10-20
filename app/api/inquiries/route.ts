import { submit } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
export function POST(request:Request){return submit(request);}
