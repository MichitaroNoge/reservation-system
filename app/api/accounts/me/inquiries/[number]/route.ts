import { myInquiries } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{number:string}>}){return myInquiries(request,(await context.params).number);}
