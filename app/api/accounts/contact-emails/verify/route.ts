import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";
import { repositoryTransaction } from "@/lib/repositories/transaction";
import { assertAccountNotDeleting } from "@/lib/services/account-lifecycle-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url); const token = url.searchParams.get("token") ?? ""; const destination = new URL("/?customerMode=settings", url.origin);
  try {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("invalid");
    const repository = await getReservationRepository(), hash = createHash("sha256").update(token).digest("hex");
    const initial = await repository.findAccountContactEmailByToken(hash);
    if (!initial?.firebaseUid) throw new Error("invalid");
    const uid = initial.firebaseUid;
    await repositoryTransaction(repository, `account:${uid}`, async repository => {
      const contact = await repository.findAccountContactEmailByToken(hash);
      const account = await repository.findAccountByFirebaseUid(uid);
      if (!contact || contact.firebaseUid !== uid || !account || account.id !== contact.accountId) throw new Error("invalid");
      await assertAccountNotDeleting(repository, uid);
      const time = Date.now(), expiresAt = Date.parse(contact.verificationExpiresAt ?? "");
      // An already verified link is a successful no-op, including after its original deadline.
      if (!contact.verifiedAt && (!Number.isFinite(expiresAt) || expiresAt <= time)) throw new Error("expired");
      if (!contact.verifiedAt) await repository.verifyAccountContactEmail(contact.id, new Date(time).toISOString());
    });
    destination.searchParams.set("contactEmail", "verified");
  } catch { console.warn(JSON.stringify({ event: "additional_contact_verification_failed" })); destination.searchParams.set("contactEmail", "invalid"); }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
