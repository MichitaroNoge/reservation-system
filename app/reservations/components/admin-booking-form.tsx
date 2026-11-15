"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminBookingEditFormSchema, adminBookingFormSchema } from "@/lib/admin-booking-form";
import { groupTypeOptions, isGroupBooking, MenuPicker, paymentConditionOptions } from "../reservation-shared";
import { defaultPaymentCondition } from "@/lib/domain";
import { STATUS } from "../constants";
import { bookingFormDateTimeLabel, bookingFormEndTime, menuSelectionLabel, selectedMenuTotal, statusLabel } from "../formatters";
import type { BookingForm, Menu, Status } from "../types";
import { useRef, type Dispatch, type SetStateAction } from "react";

export function AdminBookingForm({ id, value, onChange, menuCatalog, busy, error, onSubmit, creating = false }: { id: string; value: BookingForm; onChange: Dispatch<SetStateAction<BookingForm>>; menuCatalog: Menu[]; busy: boolean; error?: string; onSubmit: (values: BookingForm) => Promise<void>; creating?: boolean }) {
  const form = useForm<BookingForm>({ resolver: zodResolver(creating ? adminBookingFormSchema : adminBookingEditFormSchema), values: value, resetOptions: { keepDefaultValues: true }, mode: "onBlur" });
  const submitting = useRef(false);
  const field = (key: "name" | "email" | "phone" | "address" | "date" | "startTime" | "endTime" | "people" | "bookingContactName" | "dayContactName" | "dayContactPhone" | "tcCount" | "dgCount" | "groupName" | "groupNameKana" | "groupTypeOther", label: string, type = "text", required = true) => {
    const numeric = type === "number";
    const registration = form.register(key, { valueAsNumber: numeric });
    return <FormField label={label} required={required} error={form.formState.errors[key]?.message}><Input {...registration} type={type} value={value[key] ?? ""} min={key === "people" ? 1 : numeric ? 0 : undefined} max={numeric ? 999 : undefined} onChange={event => {
      void registration.onChange(event);
      const next = { ...value, [key]: numeric ? Number(event.target.value) : event.target.value };
      if (key === "name" && isGroupBooking(value)) next.companyBranchName = event.target.value;
      if (key === "bookingContactName") next.contactPersonName = event.target.value;
      if (key === "startTime") next.endTime = bookingFormEndTime({ ...next, endTime: undefined }, menuCatalog);
      onChange(next);
    }} /></FormField>;
  };
  return <form id={id} noValidate onSubmit={form.handleSubmit(async values => { if (submitting.current || busy) return; submitting.current = true; try { await onSubmit(values); } finally { submitting.current = false; } })}><fieldset disabled={busy || form.formState.isSubmitting} className="grid min-w-0 gap-5">
    {creating && <FormField label="登録時ステータス"><Select value={value.status ?? STATUS.temporaryRequested} onChange={event => onChange({ ...value, status: event.target.value as Status })}>{[STATUS.confirmed, STATUS.temporaryRequested, STATUS.temporaryConfirmed, STATUS.confirmedRequested].map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select></FormField>}
    <FormField label="予約区分"><Select value={value.bookingType ?? "individual"} onChange={event => onChange({ ...value, bookingType: event.target.value as BookingForm["bookingType"], accountType: event.target.value === "travel_agency_group" ? "travel_agency" : "individual", tcCount: event.target.value === "travel_agency_group" ? value.tcCount ?? 0 : 0, dgCount: event.target.value === "travel_agency_group" ? value.dgCount ?? 0 : 0 })}><option value="individual">一般予約</option><option value="travel_agency_group">旅行会社様専用 団体予約</option></Select></FormField>
    {field("name", isGroupBooking(value) ? "会社・支店名" : "お名前")}
    <div className="grid gap-5 sm:grid-cols-2">{field("phone", "電話番号", "tel")}{field("email", "メールアドレス", "email")}</div>{field("address", "住所", "text", false)}
    {isGroupBooking(value) && <>{field("bookingContactName", "予約担当者名", "text", creating)}{field("dayContactName", "当日責任者名", "text", creating)}{field("dayContactPhone", "当日責任者携帯番号", "tel", creating)}</>}
    <div className="grid gap-5 sm:grid-cols-2">{field("date", "利用日", "date")}{field("people", "人数", "number")}{field("startTime", "開始時間", "time")}{field("endTime", "終了時間", "time", false)}</div>
    {isGroupBooking(value) && <><div className="grid gap-5 sm:grid-cols-2">{field("tcCount", "T/C（人数の内数）", "number", false)}{field("dgCount", "D/G", "number", false)}</div>{field("groupName", "団体名", "text", creating)}{field("groupNameKana", "団体ふりがな", "text", false)}<FormField label="団体種別" required={creating} error={form.formState.errors.groupType?.message}><Select value={value.groupType ?? ""} onChange={event => onChange({ ...value, groupType: event.target.value })}><option value="">選択してください</option>{groupTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</Select></FormField>{value.groupType === "その他" && field("groupTypeOther", "団体種別 その他", "text", false)}</>}
    <MenuPicker menuCatalog={menuCatalog} selected={value.menuItems} onChange={menuItems => onChange({ ...value, menuItems, endTime: bookingFormEndTime({ ...value, menuItems, endTime: undefined }, menuCatalog) })} />
    <FormField label="支払条件"><Select value={value.paymentCondition ?? defaultPaymentCondition} onChange={event => onChange({ ...value, paymentCondition: event.target.value as BookingForm["paymentCondition"] })}>{paymentConditionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
    <FormField label="備考"><Textarea value={value.remarks ?? ""} onChange={event => onChange({ ...value, remarks: event.target.value })} /></FormField>
    {creating && <div role="status" className="grid gap-2 border-t border-border pt-4 text-sm"><strong>{menuSelectionLabel(value.menuItems)}</strong><span>{value.date && value.startTime && value.people ? `${bookingFormDateTimeLabel({ ...value, endTime: value.endTime ?? bookingFormEndTime(value, menuCatalog) })}・${value.people}名` : "日時・人数を入力してください"}</span><strong>¥{selectedMenuTotal(value.menuItems, menuCatalog).toLocaleString()}</strong></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </fieldset></form>;
}
