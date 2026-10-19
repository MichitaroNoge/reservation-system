import { reply } from "@/lib/inquiries/controllers";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{number:string;replyId:string}>}){const p=await context.params;return reply(request,p.number,p.replyId);}
