import { reply } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{number:string}>}){return reply(request,(await context.params).number,undefined,true);}
