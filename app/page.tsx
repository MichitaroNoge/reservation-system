import { ReservationEntry } from "./reservations/entry";
import type { CustomerPortalMode } from "./reservations/reservation-shared";

const customerModes = new Set(["home", "login", "register", "account", "settings", "emailChange", "accountDeletion", "reservation", "confirmedChange", "change", "cancellation"]);

export default async function Home({ searchParams }: { searchParams: Promise<{ customerMode?: string | string[] }> }) {
  const params = await searchParams;
  const value = Array.isArray(params.customerMode) ? params.customerMode[0] : params.customerMode;
  const mode = value && customerModes.has(value) ? value as CustomerPortalMode : "admin";
  return <ReservationEntry initialMode={mode} />;
}
