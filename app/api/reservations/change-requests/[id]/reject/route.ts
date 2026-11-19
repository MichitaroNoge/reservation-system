import { repositoryTransaction } from "@/lib/repositories/transaction";
import { finishHistory } from "@/lib/services/reservation-history-service";
import { historyActor, reservationSnapshot } from "@/lib/reservation-history";
import { NextResponse } from "next/server";
import { findReservation, findReservationChangeRequest } from "@/lib/repositories/reservation-lookup";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    const { id } = await context.params;
    const repository = await getReservationRepository();
    const currentRequest = await findReservationChangeRequest(repository, id);
    if (!currentRequest) return NextResponse.json({ error: "予約変更申請が見つかりません。" }, { status: 404 });
    const changeRequest = await repositoryTransaction(repository, `reservation:${currentRequest.reservationId}`, async repo => {
      const before = await findReservation(repo, currentRequest.reservationId);
      if (!before) throw new Error("予約が見つかりません。");
      const snapshot = { ...before, ...reservationSnapshot(before) };
      const reviewed = await repo.rejectReservationChangeRequest(id);
      await finishHistory(repo, snapshot, before, { kind: "change", status: "rejected", actor: historyActor(user, "admin"), referenceId: id, reason: reviewed.reason });
      return reviewed;
    });
    return NextResponse.json({ request: changeRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
