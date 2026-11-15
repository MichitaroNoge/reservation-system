"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { AdminActions, useAdminDraft, useAdminInteractions } from "@/components/ui/admin-interactions";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { reservationAssignments } from "@/lib/domain";
import { storeAssignmentFormSchema, storeAssignmentRows } from "@/lib/store-assignment-form";
import type { Reservation, Store, StoreAssignment } from "../types";

export function StoreAssignmentForm({ reservation, stores, disabled = false, allowUnassigned = false, onSave, onClose }: {
  reservation: Reservation;
  stores: Store[];
  disabled?: boolean;
  allowUnassigned?: boolean;
  onSave: (assignments: StoreAssignment[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const saved = useMemo(() => reservationAssignments(reservation), [reservation]);
  const schema = useMemo(() => storeAssignmentFormSchema(stores, saved, reservation.people, allowUnassigned), [stores, saved, reservation.people, allowUnassigned]);
  const { register, control, handleSubmit, watch, getValues, clearErrors, formState: { errors, isSubmitting, isDirty } } = useForm<{ assignments: StoreAssignment[] }>({
    resolver: zodResolver(schema), defaultValues: { assignments: storeAssignmentRows(stores, saved) },
  });
  const { fields, replace } = useFieldArray({ control, name: "assignments" });
  useEffect(() => {
    const current = getValues("assignments");
    const next = storeAssignmentRows(stores, saved, current);
    if (current.map(row => row.store).join("\u0000") !== next.map(row => row.store).join("\u0000")) { replace(next); clearErrors(); }
  }, [stores, saved, getValues, replace, clearErrors]);
  const assignments = watch("assignments");
  const total = assignments.reduce((sum, assignment) => sum + (Number.isFinite(assignment.people) ? assignment.people : 0), 0);
  const [saveError, setSaveError] = useState("");
  const { confirm } = useAdminInteractions();
  const busy = isSubmitting;
  const leave = useAdminDraft(isDirty, busy);
  const saving = useRef(false);
  const save = async (assignments: StoreAssignment[]) => {
    if (disabled || saving.current) return false;
    setSaveError("");
    saving.current = true;
    try {
      if (await onSave(assignments)) return true;
      setSaveError("保存できませんでした。入力内容を確認して再度お試しください。");
      return false;
    }
    catch { setSaveError("保存できませんでした。再度お試しください。"); return false; }
    finally { saving.current = false; }
  };
  const submit = handleSubmit(async value => {
    if (disabled || saving.current) return;
    if (allowUnassigned && saved.length > 0 && value.assignments.length === 0) { await confirm({ title: "店舗割当を解除しますか？", description: "この予約の店舗割当を解除し、未割当に戻します。", details: <p className="text-sm">{reservation.id} / {reservation.customer}</p>, confirmLabel: "割当を解除する", destructive: true, onConfirm: () => save([]) }); return; }
    await save(value.assignments);
  });
  return <><form aria-label="店舗別の割当人数" onSubmit={submit} noValidate>
    <div className="grid gap-4 p-5">
      <p className="text-sm text-muted-foreground">割り当てる店舗の人数を入力してください。利用しない店舗は0名のままにします。</p>
      {!fields.length && <p role="status" className="text-sm text-warning">有効な店舗がありません。マスタ・設定で店舗を登録してください。</p>}
      {fields.map((field, index) => <div key={field.id}>
        <FormField label={`${field.store}${stores.some(store => store.name === field.store) ? "" : saved.some(assignment => assignment.store === field.store) ? "（現在の割当）" : "（選択不可）"} の人数`} error={errors.assignments?.[index]?.people?.message}>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={Math.min(reservation.people, 999)} step={1} inputMode="numeric" className="max-w-36 tabular-nums" disabled={disabled || busy} {...register(`assignments.${index}.people`, { setValueAs: value => value === "" ? 0 : Number(value) })} />
            <span aria-hidden="true" className="text-sm text-muted-foreground">名</span>
          </div>
        </FormField>
      </div>)}
      <p role="status" className={`text-sm font-medium ${total === reservation.people || (allowUnassigned && total === 0) ? "text-success" : "text-muted-foreground"}`}>{allowUnassigned && total === 0 ? "未割当として保存できます" : `割当合計 ${total}名 ／ 予約人数 ${reservation.people}名`}</p>
      {(errors.assignments?.root?.message || errors.assignments?.message) && <p role="alert" className="text-sm text-destructive">{errors.assignments.root?.message || errors.assignments.message}</p>}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </div>
    <AdminActions>
      <Button type="button" variant="outline" disabled={busy} onClick={() => leave(onClose)}>キャンセル</Button>
      <Button type="submit" disabled={disabled || busy || (!fields.length && !allowUnassigned)}>{busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{busy ? "保存中…" : "割当を保存"}</Button>
    </AdminActions>
  </form>
  </>;
}
