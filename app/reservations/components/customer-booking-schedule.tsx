"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { customerBookingScheduleSchema } from "@/lib/customer-booking-schedule";
import type { BookingForm } from "../types";

type Schedule = Pick<BookingForm, "date" | "startTime" | "people">;
export function CustomerBookingSchedule({ value, minimumDate, busy, onChange, onNext }: { value: Schedule; minimumDate: string | null; busy: boolean; onChange: (value: Partial<Schedule>) => void; onNext: () => void }) {
  const form = useForm<Schedule>({
    resolver: zodResolver(customerBookingScheduleSchema(minimumDate)),
    values: { date: value.date, startTime: value.startTime, people: value.people },
    mode: "onTouched",
  });
  return <form id="customer-booking-schedule" noValidate onSubmit={form.handleSubmit(values => { if (minimumDate && !busy) { onChange(values); onNext(); } })} className="grid min-w-0 gap-4 sm:grid-cols-3">
    <FormField label="利用日" required error={form.formState.errors.date?.message}><Controller name="date" control={form.control} render={({ field }) => <Input {...field} type="date" min={minimumDate ?? undefined} disabled={busy} onChange={event => { const date = event.target.value; field.onChange(date); onChange({ date }); }} />} /></FormField>
    <FormField label="開始時間" required error={form.formState.errors.startTime?.message}><Controller name="startTime" control={form.control} render={({ field }) => <Input {...field} type="time" step="60" disabled={busy} onChange={event => { const startTime = event.target.value; field.onChange(startTime); onChange({ startTime }); }} />} /></FormField>
    <FormField label="人数" required error={form.formState.errors.people?.message}><Controller name="people" control={form.control} render={({ field }) => <Input {...field} type="number" inputMode="numeric" min="1" max="999" step="1" disabled={busy} value={field.value || ""} onChange={event => { const people = Number(event.target.value); field.onChange(people); onChange({ people }); }} />} /></FormField>
  </form>;
}
