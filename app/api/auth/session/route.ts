import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return NextResponse.json({
      admin: true,
      email: admin.email ?? null,
      uid: admin.uid,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
