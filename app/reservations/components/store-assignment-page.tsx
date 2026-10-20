"use client";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReservationWorklist } from "./reservation-worklist";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { duplicateAssignmentStores, isConfirmedReservation, reservationAssignments } from "@/lib/domain";
import type { Reservation, Store, StoreAssignment } from "../types";

type Props = { reservations: Reservation[]; stores: Store[]; loading?: boolean; error?: boolean; onAssign: (id: string, assignments: StoreAssignment[]) => Promise<boolean> };
export function StoreAssignmentPage({ reservations, stores, loading, error, onAssign }: Props) {
  const [search,setSearch]=useState("");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const pending = useMemo(()=>reservations.filter(r=>isConfirmedReservation(r) && !reservationAssignments(r).length).sort((a,b)=>`${a.date} ${a.startTime??""}`.localeCompare(`${b.date} ${b.startTime??""}`) || a.id.localeCompare(b.id)),[reservations]);
  const rows=pending.filter(r=>[r.id,r.customer].some(value=>value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const selected=reservations.find(r=>r.id===selectedId);
  return <>
    <ReservationWorklist count={rows.length} search={search} onSearch={setSearch} loading={loading} error={error}>
      {saved && <p role="status" className="px-5 pt-4 text-sm text-success">店舗割当を保存しました。</p>}
      {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">店舗割当待ちの予約を読み込み中…</p> : error ? <p role="alert" className="p-5 text-sm text-destructive">予約または店舗を取得できませんでした。画面上部から再読み込みしてください。</p> : <>
        {!stores.length && <p role="alert" className="px-5 pt-4 text-sm text-warning">有効な店舗がありません。マスタ管理で店舗を登録してください。</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-background/50 text-xs text-muted-foreground"><tr>{["利用日時","予約者・団体名","人数","メニュー","操作"].map(label=><th key={label} className={`px-5 py-3 font-medium ${label==="操作"?"sticky right-0 bg-background":""}`}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-border bg-card"><td className="whitespace-nowrap px-5 py-4"><span className="block font-medium">{r.date}</span><span className="text-xs text-muted-foreground">{r.startTime??"未設定"}〜{r.endTime??"未設定"}</span></td><td className="max-w-72 break-words px-5 py-4"><span className="block font-medium">{r.customer}</span>{r.groupName && <span className="block text-xs">{r.groupName}</span>}<span className="block text-xs text-muted-foreground">{r.id}</span></td><td className="whitespace-nowrap px-5 py-4 tabular-nums">{r.people}名</td><td className="max-w-64 break-words px-5 py-4">{r.menuItems?.join("、") || r.menu || "未選択"}</td><td className="sticky right-0 bg-card px-5 py-4"><Button type="button" className="min-h-11 whitespace-nowrap" disabled={!stores.length} onClick={()=>{setSelectedId(r.id);setSaved(false);}}>店舗を割り当てる</Button></td></tr>)}</tbody></table></div>
        {!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">{pending.length ? "検索に一致する予約はありません。" : "店舗割当待ちの予約はありません。"}</p>}
      </>}
    </ReservationWorklist>
    {selected && <StoreAssignmentDialog key={selected.id} reservation={selected} stores={stores} unavailable={Boolean(loading || error)} onClose={()=>setSelectedId(null)} onAssign={async(id,assignments)=>{const ok=await onAssign(id,assignments);if(ok){setSelectedId(null);setSaved(true);}return ok;}} />}
  </>;
}
function StoreAssignmentDialog({reservation:r,stores,onAssign,onClose,unavailable}:{reservation:Reservation;stores:Store[];onAssign:Props["onAssign"];onClose:()=>void;unavailable:boolean}) {
  const schema=useMemo(()=>z.object({assignments:z.array(z.object({store:z.string().min(1,"店舗を選択してください。").refine(name=>stores.some(store=>store.name===name),"有効な店舗を選択してください。"),people:z.number().int("整数で入力してください。").min(1,"1名以上を入力してください。").max(999,"999名以下を入力してください。") })).min(1,"割当先を追加してください。").max(50,"割当は50行以内にしてください。")}).superRefine((value,ctx)=>{value.assignments.forEach((assignment,index)=>{if(value.assignments.slice(0,index).some(other=>other.store===assignment.store))ctx.addIssue({code:z.ZodIssueCode.custom,path:["assignments",index,"store"],message:"同じ店舗は複数行に割り当てられません。"});});}).refine(value=>value.assignments.reduce((sum,a)=>sum+a.people,0)===r.people,{path:["assignments"],message:`割当合計を予約人数${r.people}名に合わせてください。`}),[r.people,stores]);
  const {register,control,handleSubmit,watch,formState:{errors,isSubmitting}}=useForm<{assignments:StoreAssignment[]}>({resolver:zodResolver(schema),defaultValues:{assignments:[{store:"",people:r.people}]}});
  const {fields,append,remove}=useFieldArray({control,name:"assignments"});
  const assignments=watch("assignments");const duplicates=duplicateAssignmentStores(assignments);const allStoresUsed=stores.every(store=>assignments.some(a=>a.store===store.name));const total=assignments.reduce((sum,a)=>sum+(Number.isFinite(a.people)?a.people:0),0);
  const [saveError,setSaveError]=useState("");
  const processed=!isConfirmedReservation(r)||reservationAssignments(r).length>0;
  const submit=handleSubmit(async value=>{if(processed||unavailable)return;setSaveError("");try{if(!await onAssign(r.id,value.assignments))setSaveError("保存できませんでした。入力内容を確認して再度お試しください。");}catch{setSaveError("保存できませんでした。再度お試しください。");}});
  return <Dialog open onOpenChange={open=>{if(!open&&!isSubmitting)onClose();}}><DialogContent>
    <header className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">店舗割当</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">{r.customer} ／ {r.date} {r.startTime??"未設定"}〜{r.endTime??"未設定"} ／ {r.people}名</DialogDescription></header>
    <form onSubmit={submit}><div className="grid gap-4 p-5">
      {processed && <p role="alert" className="text-sm text-warning">この予約は店舗割当済み、または割当待ちの状態ではありません。閉じて最新の一覧を確認してください。</p>}
      {fields.map((field,index)=><div key={field.id} className="grid grid-cols-[minmax(0,1fr)_100px_auto] items-start gap-2"><label className="grid min-w-0 gap-1 text-sm">店舗 {index+1}<select disabled={isSubmitting} className="h-11 min-w-0 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" aria-invalid={!!errors.assignments?.[index]?.store} {...register(`assignments.${index}.store`)}><option value="">店舗を選択</option>{stores.map(store=><option key={store.name} value={store.name} disabled={assignments.some((a,i)=>i!==index&&a.store===store.name)&&assignments[index]?.store!==store.name}>{store.name}</option>)}</select>{errors.assignments?.[index]?.store && <span role="alert" className="text-xs text-destructive">{errors.assignments[index]?.store?.message}</span>}</label><label className="grid gap-1 text-sm">人数<Input type="number" min={1} max={r.people} disabled={isSubmitting} className="h-11" aria-invalid={!!errors.assignments?.[index]?.people} {...register(`assignments.${index}.people`,{valueAsNumber:true})}/>{errors.assignments?.[index]?.people && <span role="alert" className="text-xs text-destructive">{errors.assignments[index]?.people?.message}</span>}</label><Button type="button" variant="ghost" className="mt-6 min-h-11" aria-label={`割当行${index+1}を削除`} disabled={isSubmitting||fields.length===1} onClick={()=>remove(index)}><Trash2 className="size-4"/></Button></div>)}
      <Button type="button" variant="outline" className="min-h-11 justify-self-start" disabled={isSubmitting||fields.length>=50||allStoresUsed} onClick={()=>append({store:"",people:Math.max(0,r.people-total)})}><Plus className="size-4"/>割当先を追加</Button>
      {duplicates.length>0&&<p role="alert" className="text-sm text-destructive">同じ店舗は複数行に割り当てられません：{duplicates.join("、")}</p>}
      <p className={`text-sm font-medium ${total===r.people?"text-success":"text-destructive"}`}>割当合計 {total}名 ／ 予約人数 {r.people}名</p>
      {(errors.assignments?.root?.message || errors.assignments?.message) && <p role="alert" className="text-sm text-destructive">{errors.assignments.root?.message || errors.assignments.message}</p>}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </div><footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background p-5"><Button type="button" variant="outline" className="min-h-11" disabled={isSubmitting} onClick={onClose}>閉じる</Button><Button type="submit" className="min-h-11" disabled={isSubmitting||processed||unavailable||!stores.length||duplicates.length>0}>{isSubmitting&&<LoaderCircle className="size-4 animate-spin"/>}{isSubmitting?"保存中…":"割当を保存"}</Button></footer></form>
  </DialogContent></Dialog>;
}
