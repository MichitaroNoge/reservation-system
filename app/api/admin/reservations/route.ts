import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { getDatabase } from "@/lib/db/client";
import { DrizzleReservationRepository } from "@/lib/repositories/drizzle-reservation-repository";
import { reservationExportSchema } from "@/lib/reservation-export-validation";
import { earliestReservationDate } from "@/lib/reservation-lead-time";
const input = reservationExportSchema.extend({ page: z.number().int().min(1).max(100000), pageSize: z.number().int().min(1).max(100) }).strict();
export async function POST(request: Request) { try {
    await requireAdmin(request);
    if (Number(request.headers.get('content-length')) > 8192)
        return Response.json({ error: '検索条件が大きすぎます。' }, { status: 413 });
    const { page, pageSize, ...query } = input.parse(await readJsonObject(request));
    return Response.json(await new DrizzleReservationRepository(await getDatabase()).reservationPage(query, page, pageSize, earliestReservationDate(0)), { headers: { 'Cache-Control': 'private, no-store' } });
}
catch (error) {
    return apiErrorResponse(error);
} }
