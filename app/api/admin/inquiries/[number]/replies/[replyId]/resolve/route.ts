import { resolveReplyMail } from "@/lib/inquiries/controllers";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ number: string; replyId: string }> }) {
  const { number, replyId } = await context.params;
  return resolveReplyMail(request, number, replyId);
}
