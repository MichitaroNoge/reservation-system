import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { historyKinds, historyStatuses, historyNotification, matchesHistory } from "@/lib/reservation-history";

const querySchema = z.object({ reservationId: z.string().max(30).regex(/^RSV-\d+$/).optional(), kind: z.enum(historyKinds).optional(), status: z.enum(historyStatuses).optional(), keyword: z.string().trim().max(100).default(""), from: z.string().date().optional(), to: z.string().date().optional(), page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) }).strict().refine(value => !value.from || !value.to || value.from <= value.to, { path: ["to"], message: "終了日は開始日以降を指定してください。" });
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    for (const key of params.keys()) if (params.getAll(key).length > 1) throw new z.ZodError([{ code: "custom", path: [key], message: "条件が重複しています。" }]);
    const query = querySchema.parse(Object.fromEntries(params));
    const repo = await getReservationRepository();
    let result;
    if (repo.queryReservationHistory) result = await repo.queryReservationHistory(query);
    else {
      const entries = await repo.listReservationHistory?.(query.reservationId) ?? [];
      const filtered = entries.filter(entry => matchesHistory(entry, query)).sort((a,b) => (b.processedAt ?? b.requestedAt ?? "").localeCompare(a.processedAt ?? a.requestedAt ?? "") || b.id.localeCompare(a.id));
      result = { items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize, supported: !!repo.listReservationHistory };
    }
    if (result.items.length) {
      const codes = [...new Set(result.items.map(entry => entry.reservationCode))];
      const deliveries = repo.listApprovalEmailDeliveriesForReservations ? await repo.listApprovalEmailDeliveriesForReservations(codes) : await repo.listApprovalEmailDeliveries();
      result.items = result.items.map(entry => ({ ...entry, notification: historyNotification(entry, deliveries) }));
    }
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
