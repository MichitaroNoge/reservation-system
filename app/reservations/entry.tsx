"use client";

import dynamic from "next/dynamic";
import type { CustomerPortalMode } from "./reservation-shared";

const Loading = () => <p role="status" className="p-5 text-sm text-muted-foreground">画面を読み込み中…</p>;
const AdminApp = dynamic(() => import("./admin-app"), { loading: Loading });
const CustomerApp = dynamic(() => import("./customer-app"), { loading: Loading });

/** Resolve the entry on the server so Next can preload the selected application's chunks. */
export function ReservationEntry({ initialMode }: { initialMode: CustomerPortalMode | "admin" }) {
  return initialMode === "admin" ? <AdminApp /> : <CustomerApp initialMode={initialMode} />;
}
