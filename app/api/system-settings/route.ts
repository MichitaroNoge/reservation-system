import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse, readJsonObject, ApiValidationError } from "@/lib/api-validation";
import { getReservationRepository } from "@/lib/repositories";
import { systemSettingsSchema } from "@/lib/system-settings";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ settings: await (await getReservationRepository()).getSystemSettings() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const result = systemSettingsSchema.safeParse(await readJsonObject(request));
    if (!result.success) throw new ApiValidationError(result.error.issues[0].message);
    if (result.data.revision === undefined) throw Object.assign(new Error("設定画面を再読み込みしてから保存してください。"), { statusCode: 409 });
    return NextResponse.json({ settings: await (await getReservationRepository()).saveSystemSettings(result.data) });
  } catch (error) { return apiErrorResponse(error); }
}
