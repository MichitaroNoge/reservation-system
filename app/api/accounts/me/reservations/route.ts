import { NextResponse } from "next/server";
import { requireCustomerSession } from "../../../../../lib/auth";
import { getReservationRepository } from "../../../../../lib/repositories";

export async function GET() {
  const session = await requireCustomerSession();
  const repository = getReservationRepository();
  const reservations = await repository.listReservationsForReservationAccount(session.uid);
  return NextResponse.json(reservations);
}
