import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { buildEmailContent } from "@/lib/email/email-layout";
import { isEmailTemplateKey } from "@/lib/email/email-template-catalog";
import { renderTemplatePreview } from "@/lib/email/template-preview";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const input = await readJsonObject(request);
    const templateKey = typeof input.templateKey === "string" ? input.templateKey : "";
    if (!isEmailTemplateKey(templateKey)) throw new Error(`未対応のtemplateKeyです: ${templateKey}`);
    const rendered = renderTemplatePreview(templateKey, String(input.subject ?? ""), String(input.body ?? ""));
    return NextResponse.json({ preview: { ...buildEmailContent(rendered.subject, rendered.body), body: rendered.body } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
