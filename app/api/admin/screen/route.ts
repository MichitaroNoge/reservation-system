import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { readAdminScreen } from "@/lib/admin-screen";
const query = z.object({ view: z.enum(['dashboard', 'reservations', 'reservationApprovals', 'cancellationApprovals', 'confirmedReservationRequests', 'reservationChangeRequests', 'confirmationContacts', 'masters', 'customers', 'stores', 'menus', 'emailTemplates', 'otherSettings', 'googleCalendarSettings', 'storeAssignments', 'bookingReminders', 'menuReminders', 'reservationCalendar', 'inquiries', 'inquiryReplyTemplates', 'reservationNotifications']), windowDays: z.coerce.number().int().min(1).max(365).default(7) }).strict();
export async function GET(request: Request) { try {
    await requireAdmin(request);
    const input = query.parse(readSearchParams(request));
    return Response.json(await readAdminScreen(input.view, input.windowDays), { headers: { 'Cache-Control': 'private, no-store' } });
}
catch (error) {
    return apiErrorResponse(error);
} }
function readSearchParams(request: Request) { const params = new URL(request.url).searchParams; for (const key of params.keys())
    if (params.getAll(key).length !== 1)
        throw new z.ZodError([{ code: "custom", path: [key], message: "条件が重複しています。" }]); return Object.fromEntries(params); }
