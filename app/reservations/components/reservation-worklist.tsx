"use client";
import type { ReactNode } from "react";
import { ManagementPage, ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { ListSearchField } from "@/components/ui/list-search-field";

export function ReservationWorklist({count,search,onSearch,loading,error,children}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean;children:ReactNode}) {
  return <ManagementPage><ListPanel>
    <ReservationSearchToolbar count={count} search={search} onSearch={onSearch} loading={loading} error={error} />
    {children}
  </ListPanel></ManagementPage>;
}

export function ReservationSearchToolbar({count,search,onSearch,loading,error}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean}) {
  return (<ListToolbar>
      <ListSearchField aria-label="予約ID・顧客名で検索" placeholder="予約ID・顧客名で検索" value={search} onChange={event=>onSearch(event.target.value)} />
      <ResultCount count={count} loading={loading} error={error} />
    </ListToolbar>);
}
