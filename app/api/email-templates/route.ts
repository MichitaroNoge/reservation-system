import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";
import { defaultEmailTemplates } from "@/lib/email/email-template-catalog";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const repository = getReservationRepository();
    const existing = await repository.listEmailTemplates();
    const existingKeys = new Set(existing.map((item) => item.templateKey));
    for (const template of defaultEmailTemplates()) {
      if (!existingKeys.has(template.templateKey)) await repository.upsertEmailTemplate(template);
    }
    return NextResponse.json({ templates: await repository.listEmailTemplates() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
