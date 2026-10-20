import type { Menu, SystemSettings } from "./domain";
import { reservationInterval, reservationOccupancyKind, type AvailabilityReservation } from "./reservation-availability";
export function addCalendarDays(date:string,days:number){return new Date(Date.parse(`${date}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);}
export function calendarDates(from:string,to:string){const days=Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);return Number.isFinite(days)&&days>=0&&days<366?Array.from({length:days+1},(_,i)=>addCalendarDays(from,i)):[];}
export function calendarWeek(date:string){const day=new Date(`${date}T00:00:00Z`).getUTCDay();return addCalendarDays(date,-((day+6)%7));}
export function calendarDay(date:string,reservations:AvailabilityReservation[],menus:Pick<Menu,"name"|"duration">[],settings:Partial<SystemSettings>={}) {
 const start=Date.parse(`${date}T00:00:00Z`)/60000,end=start+1440;
 const entries=reservations.flatMap(reservation=>{const kind=reservationOccupancyKind(reservation),span=reservationInterval(reservation,menus);return kind&&span&&span.start<end&&span.end>start?[{reservation,kind,start:Math.max(start,span.start)-start,end:Math.min(end,span.end)-start,uncertain:span.uncertain}]:[];}).sort((a,b)=>a.start-b.start||a.end-b.end||a.reservation.id.localeCompare(b.reservation.id));
 const events=entries.filter(e=>e.kind!=="pending").flatMap(e=>[{at:e.start,booked:e.kind==="booked"?e.reservation.people:0,combined:e.reservation.people},{at:e.end,booked:e.kind==="booked"?-e.reservation.people:0,combined:-e.reservation.people}]).sort((a,b)=>a.at-b.at);
 let booked=0,combined=0,peak=0,combinedPeak=0;
 for(let i=0;i<events.length;){const at=events[i].at;do{booked+=events[i].booked;combined+=events[i].combined;i++;}while(i<events.length&&events[i].at===at);peak=Math.max(peak,booked);combinedPeak=Math.max(combinedPeak,combined);}
 const blocks=(settings.blockedPeriods??[]).flatMap(period=>{const a=Date.parse(`${period.start}:00Z`)/60000,b=Date.parse(`${period.end}:00Z`)/60000;return a<end&&b>start?[{...period,startMinute:Math.max(a,start)-start,endMinute:Math.min(b,end)-start}]:[];});
 return {date,entries,peak,combinedPeak,blocks,uncertain:entries.some(e=>e.uncertain),capacity:settings.acceptanceCapacity??null};
}
export function calendarCapacityWarning(day: Pick<ReturnType<typeof calendarDay>, "capacity" | "peak" | "combinedPeak">) {
  if (day.capacity === null || day.combinedPeak <= day.capacity) return null;
  return day.peak > day.capacity ? "本予約で上限超過" : "仮予約込みで上限超過";
}

/** Separate independent overlap groups so a busy afternoon does not narrow morning cards. */
export function calendarLanes(entries: ReturnType<typeof calendarDay>["entries"], minimumMinutes = 0) {
  type Entry = (typeof entries)[number];
  const groups: Entry[][] = [];
  let groupEnd = -Infinity;
  for (const entry of [...entries].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (!groups.length || entry.start >= groupEnd) {
      groups.push([]);
      groupEnd = -Infinity;
    }
    groups[groups.length - 1].push(entry);
    groupEnd = Math.max(groupEnd, entry.end, entry.start + minimumMinutes);
  }
  const items = groups.flatMap(group => {
    const ends: number[] = [];
    const placed = group.map(entry => {
      let lane = ends.findIndex(end => end <= entry.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = Math.max(entry.end, entry.start + minimumMinutes);
      return { ...entry, lane };
    });
    return placed.map(entry => ({ ...entry, lanes: ends.length }));
  });
  return { items, lanes: Math.max(1, ...items.map(item => item.lanes)) };
}
