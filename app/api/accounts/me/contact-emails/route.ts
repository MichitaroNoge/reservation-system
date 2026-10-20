import { consumeLimits } from "@/lib/abuse-limits";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireVerifiedFirebaseUser } from "@/lib/auth";
import { apiErrorResponse, readJsonObject } from "@/lib/api-validation";
import { buildEmailContent } from "@/lib/email/email-layout";
import { repositoryEmailClient } from "@/lib/email/email-sender-settings";
import { renderRepositoryEmail } from "@/lib/email/template-email-service";
import { getReservationRepository } from "@/lib/repositories";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const runtime = "nodejs";

export async function GET(request: Request) {
  try { const user = await requireVerifiedFirebaseUser(request); const repository = (await getReservationRepository()); const account = await repository.findAccountByFirebaseUid(user.uid); return NextResponse.json({ contactEmails: account?.id ? await repository.listAccountContactEmails(account.id) : [] }); }
  catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedFirebaseUser(request); const repository = (await getReservationRepository()); const account = await repository.findAccountByFirebaseUid(user.uid);
    if (!account?.id) return NextResponse.json({ error: "アカウントが見つかりません。" }, { status: 404 });
    const email = String((await readJsonObject(request)).email ?? "").trim().toLowerCase();
    if (email.length > 255 || !emailPattern.test(email)) return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
    const current = await repository.listAccountContactEmails(account.id);
    if (current.length >= 5) return NextResponse.json({ error: "追加連絡先は5件まで登録できます。" }, { status: 400 });
    if (email === account.contact.toLowerCase() || current.some((item) => item.email.toLowerCase() === email)) return NextResponse.json({ error: "このメールアドレスは登録済みです。" }, { status: 409 });
    await consumeLimits([
      { key: `contact-email:uid:${user.uid}`, max: 5, seconds: 3600 },
      { key: `contact-email:cooldown:${user.uid}`, max: 1, seconds: 60 },
    ]);
    const token = randomBytes(32).toString("hex"); const tokenHash = createHash("sha256").update(token).digest("hex"); const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const contactEmail = await repository.createAccountContactEmail({ accountId: account.id, email, verificationTokenHash: tokenHash, verificationExpiresAt: expiresAt.toISOString() });
    const verificationUrl = `${new URL(request.url).origin}/api/accounts/contact-emails/verify?token=${token}`;
    try {
      const rendered = await renderRepositoryEmail(repository, "additional_email_verification", { customerName: account.name, email, verificationUrl, expiresAt: new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(expiresAt) });
      await (await repositoryEmailClient(repository)).send({ to: email, ...buildEmailContent(rendered.subject, rendered.body), idempotencyKey: `additional-email-verification/${contactEmail.id}` });
    } catch (error) {
      await repository.deleteAccountContactEmail(contactEmail.id);
      throw error;
    }
    return NextResponse.json({ contactEmail }, { status: 201 });
  } catch (error) { return apiErrorResponse(error); }
}

export async function DELETE(request: Request) {
  try { const user = await requireVerifiedFirebaseUser(request); const repository = (await getReservationRepository()); const account = await repository.findAccountByFirebaseUid(user.uid); const id = new URL(request.url).searchParams.get("id"); if (!account?.id || !id || !(await repository.listAccountContactEmails(account.id)).some((item) => item.id === id)) return NextResponse.json({ error: "追加連絡先が見つかりません。" }, { status: 404 }); await repository.deleteAccountContactEmail(id); return NextResponse.json({ deleted: true }); }
  catch (error) { return apiErrorResponse(error); }
}
