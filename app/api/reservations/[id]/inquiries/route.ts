import { submit,reservationContext } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return reservationContext(request,(await context.params).id);}
export async function POST(request:Request,context:Context){return submit(request,(await context.params).id);}
