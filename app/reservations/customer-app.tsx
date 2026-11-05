"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import CustomerPortal from "./customer-portal";
import { emptyReservationForm, type CustomerPortalMode } from "./reservation-shared";
import { STATUS } from "./constants";
import type { Menu, Reservation, ReservationChangeRequest } from "./types";
import { requestJson } from "./api-client";
import { ReservationSubmission } from "./reservation-submission";

type Props = ComponentProps<typeof CustomerPortal>;
export default function CustomerApp({ initialMode = "home" }: { initialMode?: CustomerPortalMode }) {
  const [form, setForm] = useState(() => emptyReservationForm(STATUS.confirmedRequested));
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(initialMode);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [error, setError] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const loaded = useRef(false);
  const submission = useRef(new ReservationSubmission());

  useEffect(() => {
    if (!["reservation", "change"].includes(mode) || loaded.current) return;
    const controller = new AbortController();
    setMenuLoading(true);
    setError("");
    void requestJson<{ menus: Menu[] }>("/api/menus", { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setMenus(result.menus);
      loaded.current = true;
      setError("");
    }).catch(() => {
      if (!controller.signal.aborted) setError("メニューを取得できませんでした。再読み込みしてください。");
    }).finally(() => { if (!controller.signal.aborted) setMenuLoading(false); });
    return () => controller.abort();
  }, [mode, retry]);

  const create: Props["onSubmitReservation"] = async (input, options) => {
    const payload = JSON.stringify({ ...input, customerAccountMode: options?.customerAccountMode });
    const key = submission.current.begin(payload);
    const result = await requestJson<{ reservation: Reservation; receiptEmail?: { status: "not_requested" | "pending" | "sent" | "failed" } }>("/api/reservations", {
      method: "POST", authToken: options?.authToken, body: payload, headers: { "Idempotency-Key": key },
    });
    submission.current.complete(key);
    return { ...result.reservation, receiptEmailStatus: result.receiptEmail?.status };
  };
  const cancel: Props["onSubmitCancellation"] = async (input, options) => (await requestJson<{ reservation: Reservation }>("/api/reservations/cancellation-request", { method: "POST", authToken: options?.authToken, body: JSON.stringify(input) })).reservation;
  const confirm: Props["onSubmitConfirmedReservationChange"] = async (input, options) => (await requestJson<{ reservation: Reservation }>("/api/reservations/confirmed-request", { method: "POST", authToken: options?.authToken, body: JSON.stringify(input) })).reservation;
  const change: Props["onSubmitChangeRequest"] = async (input, options) => (await requestJson<{ request: ReservationChangeRequest }>("/api/reservations/change-requests", { method: "POST", authToken: options?.authToken, body: JSON.stringify(input) })).request;
  return <>
    <CustomerPortal
      initialMode={initialMode} form={form} setForm={setForm} step={step} setStep={setStep} onModeChange={setMode}
      onAdmin={() => window.location.assign("/")} menuCatalog={menus}
      menuLoading={menuLoading} menuError={error} onRetryMenus={() => setRetry(value => value + 1)}
      notify={(message, variant) => toast[variant ?? (/失敗|できません|確認してください|未完了/.test(message) ? "error" : "success")](message)}
      onSubmitReservation={create} onSubmitCancellation={cancel} onSubmitConfirmedReservationChange={confirm} onSubmitChangeRequest={change}
    />
  </>;
}
