"use client";
import { useEffect, useRef, useState } from "react";
import type { ReservationSearch } from "@/lib/reservation-search";
import type { ReservationPage } from "@/lib/admin-read-model";
import { requestJson } from "../api-client";

export function useReservationPage(enabled: boolean, query: ReservationSearch, getToken: () => Promise<string>, version: unknown) {
  const key = JSON.stringify(query);
  const token = useRef(getToken);
  token.current = getToken;
  const [position, setPosition] = useState({ key: "", page: 1 });
  const [data, setData] = useState<ReservationPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const page = position.key === key ? position.page : 1;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const value = await requestJson<ReservationPage>("/api/admin/reservations", {
          method: "POST",
          authToken: await token.current(),
          body: JSON.stringify({ ...JSON.parse(key), page, pageSize: 50 }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!controller.signal.aborted) setData(value);
      } catch (e) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(e instanceof Error ? e.message : "予約を取得できませんでした。");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    // Debounce typing; abort obsolete filters so an older response cannot replace the current result.
    const timer = setTimeout(() => void load(), 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [enabled, key, page, version, retry]);

  return {
    data, loading, error,
    page: data?.page ?? page,
    setPage: (next: number) => setPosition({ key, page: next }),
    reload: () => setRetry(value => value + 1),
  };
}
