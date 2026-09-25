import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { sendDueConfirmationEmails } from "@/lib/services/confirmation-email-service";
import { sendPendingReceiptEmails } from "@/lib/services/receipt-email-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  try {
    requireCronSecret(request);
    const repository = getReservationRepository();
    const result = await sendDueConfirmationEmails(repository);
    const receiptEmails = await sendPendingReceiptEmails(repository);
    return NextResponse.json({ ...result, receiptEmails });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new Error("CRON_SECRET is required.");
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const headerToken = request.headers.get("x-cron-secret") ?? "";
  if (bearerToken === expected || headerToken === expected) return;
  throw new Error("Invalid cron secret.");
}
