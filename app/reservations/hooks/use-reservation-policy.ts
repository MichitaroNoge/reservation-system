"use client";
import { useEffect, useState } from "react";
export function useReservationPolicy() {
  const [policy, setPolicy] = useState<{days:number;minimumDate:string} | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled=false;
    const load = async()=>{
      try {const response=await fetch("/api/reservation-policy",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error();if(!cancelled){setPolicy(body);setError("");}}
      catch{if(!cancelled){setPolicy(null);setError("申請の受付期限を取得できません。画面を再読み込みしてください。");}}
    };
    void load();const timer=setInterval(()=>void load(),60000);
    return()=>{cancelled=true;clearInterval(timer);};
  },[]);
  return {policy,error};
}
