import { NextResponse } from "next/server";
import { requireCustomerSession } from "../../../../lib/auth";
import { getReservationRepository } from "../../../../lib/repositories";

export async function GET() {
  const session = await requireCustomerSession();
  const repository = getReservationRepository();
  const account = await repository.findAccountByFirebaseUid(session.uid);
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json(account);
}
