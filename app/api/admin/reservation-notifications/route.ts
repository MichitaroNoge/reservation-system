import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryProvider } from "@/lib/db/environment";
import { readBody, sameOrigin } from "@/lib/inquiries/http";
import { recoverReservationNotification, reservationNotificationProblems } from "@/lib/services/reservation-notification-recovery";
export const runtime = "nodejs";
const input = z.object({ deliveryKey: z.string().min(1).max(180), revision: z.number().int().nonnegative(), action: z.enum(["send_current", "record_sent"]), confirmed: z.literal(true) }).strict();
async function handle(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (repositoryProvider() !== "drizzle") return Response.json({ supported: false });
    const repo = await getReservationRepository();
    let message: string | undefined;
    if (request.method === "POST") {
      sameOrigin(request); const body = input.parse(await readBody(request));
      message = await recoverReservationNotification(repo, body.deliveryKey, body.revision, body.action);
      console.info(JSON.stringify({ event: "reservation_notification_recovery", actor: admin.uid, action: body.action }));
    }
    return Response.json({ supported: true, localRetryEnabled: process.env.APPROVAL_EMAIL_WORKER_ENABLED === "true", ...await reservationNotificationProblems(repo), message }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
export const GET = handle;
export const POST = handle;
