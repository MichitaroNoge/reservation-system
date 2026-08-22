import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/auth";
import { getReservationRepository } from "../../../../../lib/repositories";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  const repository = getReservationRepository();
  return NextResponse.json(await repository.reactivateAccount(id));
}
