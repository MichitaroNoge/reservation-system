"use client";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function ReservationWorklist({count,search,onSearch,loading,error,children}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean;children:ReactNode}) {
  return <main className="w-full px-4 pb-12 pt-8 sm:px-6 lg:px-9"><section className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
    <ReservationSearchToolbar count={count} search={search} onSearch={onSearch} loading={loading} error={error} />
    {children}
  </section></main>;
}

export function ReservationSearchToolbar({count,search,onSearch,loading,error}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean}) {
  return (<div className="flex flex-wrap items-center gap-3 border-b border-border bg-background/40 px-5 py-4">
      <label className="reservation-search w-full! sm:w-80!" aria-label="予約ID・顧客名で検索"><div><Search aria-hidden/><input placeholder="予約ID・顧客名で検索" value={search} onChange={event=>onSearch(event.target.value)}/></div></label>
      <div className="result-count my-0! mr-0! ml-auto! whitespace-nowrap [&_strong]:text-[23px]! [&_span]:text-xs!" aria-live="polite"><span>該当</span><strong>{loading||error?"—":count}</strong><span>件</span></div>
    </div>);
}
