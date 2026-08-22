import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/auth";
import { getReservationRepository } from "../../../../lib/repositories";

export async function GET() {
  await requireAdminSession();
  const repository = getReservationRepository();
  return NextResponse.json(await repository.listInactiveAccounts());
}
