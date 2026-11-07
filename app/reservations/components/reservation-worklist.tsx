"use client";
import type { ReactNode } from "react";
import { ManagementPage, ListPanel, ListToolbar, ResultCount } from "@/components/ui/management-layout";
import { ListSearchField } from "@/components/ui/list-search-field";

export function ReservationWorklist({count,search,onSearch,loading,error,children,searchLabel}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean;children:ReactNode;searchLabel?:string}) {
  return <ManagementPage><ListPanel>
    <ReservationSearchToolbar count={count} search={search} onSearch={onSearch} loading={loading} error={error} searchLabel={searchLabel} />
    {children}
  </ListPanel></ManagementPage>;
}

export function ReservationSearchToolbar({count,search,onSearch,loading,error,searchLabel="予約ID・顧客名で検索"}:{count:number;search:string;onSearch:(value:string)=>void;loading?:boolean;error?:boolean;searchLabel?:string}) {
  return (<ListToolbar>
      <ListSearchField aria-label={searchLabel} placeholder={searchLabel} value={search} onChange={event=>onSearch(event.target.value)} />
      <ResultCount count={count} loading={loading} error={error} />
    </ListToolbar>);
}
