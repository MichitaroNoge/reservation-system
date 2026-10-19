import { adminInquiries } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
type Context={params:Promise<{number:string}>};
export async function GET(request:Request,context:Context){return adminInquiries(request,(await context.params).number);}
export async function PATCH(request:Request,context:Context){return adminInquiries(request,(await context.params).number);}
