import { reservationInquiryHistory } from "@/lib/inquiries/controllers";
export const runtime = "nodejs";
export async function GET(request: Request, context: {params: Promise<{id: string}>}) {
  return reservationInquiryHistory(request, (await context.params).id, true);
}
