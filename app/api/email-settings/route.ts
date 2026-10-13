import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { allowedFromEmails, defaultEmailSettings, validateEmailSettings } from "@/lib/email/email-sender-settings";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const repository = getReservationRepository();
    const settings = (await repository.getEmailSettings()) ?? await repository.upsertEmailSettings(defaultEmailSettings());
    return NextResponse.json({ settings, allowedFromEmails: allowedFromEmails() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJsonObject(request);
    const settings = {
      settingKey: "default" as const,
      senderName: String(body.senderName ?? "").trim(),
      fromEmail: String(body.fromEmail ?? "").trim(),
      replyToEnabled: body.replyToEnabled === true,
      replyToEmail: body.replyToEnabled === true ? String(body.replyToEmail ?? "").trim() : null,
    };
    validateEmailSettings(settings);
    return NextResponse.json({ settings: await getReservationRepository().upsertEmailSettings(settings) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
