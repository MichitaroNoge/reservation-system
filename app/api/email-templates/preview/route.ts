import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { buildEmailContent } from "@/lib/email/email-layout";
import { isEmailTemplateKey } from "@/lib/email/email-template-catalog";
import { renderTemplate } from "@/lib/email/template-renderer";

const sampleVariables = {
  customerName: "山田太郎",
  reservationId: "RSV-1001",
  reservationDate: "2026-10-10",
  reservationTime: "18:00",
  storeName: "広島店",
  numberOfGuests: "20",
  menuName: "季節のコース",
};

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const input = await readJsonObject(request);
    const templateKey = typeof input.templateKey === "string" ? input.templateKey : "";
    if (!isEmailTemplateKey(templateKey)) throw new Error(`未対応のtemplateKeyです: ${templateKey}`);
    const rendered = renderTemplate(templateKey, String(input.subject ?? ""), String(input.body ?? ""), sampleVariables);
    return NextResponse.json({ preview: { ...buildEmailContent(rendered.subject, rendered.body), body: rendered.body } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
