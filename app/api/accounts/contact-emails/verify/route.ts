import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getReservationRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url); const token = url.searchParams.get("token") ?? ""; const destination = new URL("/?customerMode=home", url.origin);
  try {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("invalid");
    const repository = (await getReservationRepository()); const contact = await repository.findAccountContactEmailByToken(createHash("sha256").update(token).digest("hex"));
    if (!contact || !contact.verificationExpiresAt || new Date(contact.verificationExpiresAt).getTime() < Date.now()) throw new Error("expired");
    if (!contact.verifiedAt) await repository.verifyAccountContactEmail(contact.id, new Date().toISOString());
    destination.searchParams.set("contactEmail", "verified");
  } catch (error) { console.error("Additional contact email verification failed", error); destination.searchParams.set("contactEmail", "invalid"); }
  return NextResponse.redirect(destination);
}
