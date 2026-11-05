import type { ReactNode } from "react";
import { Grid2X2, CalendarDays, UsersRound, Store, Settings, UtensilsCrossed, ChartNoAxesColumn, Bell, Mail, ChevronRight, Check, X, Plus, Search, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Icon({ name }: { name: string }) {
  const icons: Record<string, LucideIcon> = { grid: Grid2X2, calendar: CalendarDays, users: UsersRound, store: Store, settings: Settings, menu: UtensilsCrossed, chart: ChartNoAxesColumn, bell: Bell, mail: Mail, arrow: ChevronRight, check: Check, close: X, plus: Plus, search: Search };
  const Component = icons[name];
  return Component ? <Component aria-hidden="true" className="shrink-0" /> : null;
}

export function Stat({ icon, label, value, note, color, onClick }: { icon: string; label: string; value: string; note: string; color: string; onClick?: () => void }) {
  const tone = color === "amber" ? "bg-warning/10 text-warning" : color === "violet" ? "bg-violet-50 text-violet-700" : color === "green" ? "bg-success/10 text-success" : "bg-primary/10 text-primary";
  return <Card><button className="flex min-h-28 w-full items-start gap-4 p-5 text-left transition-colors hover:bg-muted/40 disabled:cursor-default" onClick={onClick} disabled={!onClick}><span className={`grid size-10 shrink-0 place-items-center rounded-md ${tone}`}><Icon name={icon}/></span><div><p className="text-sm text-muted-foreground">{label}</p><strong className="mt-1 block text-2xl">{value}<small className="ml-1 text-xs font-medium text-muted-foreground">件</small></strong>{note && <span className="mt-1 block text-xs text-muted-foreground">{note}</span>}</div></button></Card>;
}

export function InfoMetric({ icon, label, value }: { icon?: string; label: string; value: string; color: string }) {
  return <div className="flex items-center gap-3 py-4">{icon && <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary"><Icon name={icon}/></span>}<div><p className="text-xs text-muted-foreground">{label}</p><strong className="text-2xl">{value}<small className="ml-1 text-xs font-medium text-muted-foreground">件</small></strong></div></div>;
}

export function TaskGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">{children}</div>;
}

export function Task({ color, title, count, text, onClick }: { color: string; title: string; count?: number; text: string; onClick?: () => void }) {
  const variant = color === "red" ? "destructive" : color === "amber" ? "warning" : color === "green" ? "success" : "default";
  return <Button variant="outline" className="h-auto min-h-16 w-full justify-start min-w-0 whitespace-normal p-4 text-left" onClick={onClick}><span className={`h-8 w-1 shrink-0 rounded-full ${color === "red" ? "bg-destructive" : color === "amber" ? "bg-warning" : color === "green" ? "bg-success" : "bg-primary"}`}/><span className="min-w-0 flex-1"><strong className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">{title}{count !== undefined && <Badge variant={variant}>{count}件</Badge>}</strong><small className="mt-1 block text-xs font-normal text-muted-foreground">{text}</small></span><Icon name="arrow"/></Button>;
}
