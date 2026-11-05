import { getReplyTemplate, updateReplyTemplate } from "@/lib/inquiries/reply-template-controllers";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return getReplyTemplate(request, (await context.params).id); }
export async function PUT(request: Request, context: Context) { return updateReplyTemplate(request, (await context.params).id); }
