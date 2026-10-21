import { createHash } from "node:crypto";
import type { Reservation } from "../domain";
import { reservationTemplateVariables } from "../email/email-template-catalog";
export function reservationNotificationSnapshot(r: Reservation) {
  const kind = ["confirmed", "waiting_for_visit", "visited"].includes(r.status) ? "confirmed" : r.status;
  return createHash("sha256").update(JSON.stringify({ ...reservationTemplateVariables(r), email: r.email ?? "", revision: r.revision ?? 0, kind })).digest("hex");
}
