import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { emailTemplateDefinitions, isEmailTemplateKey } from "@/lib/email/email-template-catalog";
import { validateTemplate } from "@/lib/email/template-renderer";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ templateKey: string }> }) {
  try {
    await requireAdmin(request);
    const { templateKey } = await context.params;
    if (!isEmailTemplateKey(templateKey)) throw new Error(`未対応のtemplateKeyです: ${templateKey}`);
    const body = await readJsonObject(request);
    const subject = typeof body.subject === "string" ? body.subject : "";
    const templateBody = typeof body.body === "string" ? body.body : "";
    const isActive = body.isActive !== false;
    validateTemplate(templateKey, subject, templateBody);
    const repository = getReservationRepository();
    const current = await repository.getEmailTemplate(templateKey);
    const template = await repository.upsertEmailTemplate({
      ...current,
      templateKey,
      name: current?.name ?? emailTemplateDefinitions[templateKey].name,
      subject,
      body: templateBody,
      isActive,
    });
    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
