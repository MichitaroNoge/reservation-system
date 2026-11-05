import type { ReactNode } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Grid2X2, CalendarDays, UsersRound, Store, Settings, UtensilsCrossed, ChartNoAxesColumn, Bell, Mail, ChevronRight, Check, X, Plus, Search, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export function Task({ title, count, text, loading = false, error = false, onClick }: {
  title: string;
  count: number;
  text: string;
  loading?: boolean;
  error?: boolean;
  onClick?: () => void;
}) {
  const needsAction = !loading && !error && count > 0;
  const StatusIcon = loading ? LoaderCircle : error || needsAction ? CircleAlert : Check;
  const status = loading ? "読み込み中" : error ? "取得エラー" : needsAction ? "要対応" : "対応不要";

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-auto w-full min-w-0 items-stretch whitespace-normal p-4 text-left sm:h-auto",
        needsAction
          ? "border-warning/60 bg-warning/10 hover:border-warning hover:bg-warning/15 hover:text-foreground"
          : "bg-card shadow-none hover:bg-muted/60 hover:text-foreground",
      )}
      disabled={loading || !onClick}
      aria-busy={loading}
      onClick={onClick}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="flex flex-wrap items-start justify-between gap-2">
          <strong className="text-sm">{title}</strong>
          <Badge variant={needsAction ? "warning" : error ? "destructive" : "secondary"} className={cn("shrink-0 gap-1", needsAction && "text-foreground [&_svg]:text-warning")}>
            <StatusIcon aria-hidden="true" className={cn("size-3.5!", loading && "animate-spin")} />
            {status}
          </Badge>
        </span>
        <span className="flex-1 text-xs font-normal text-muted-foreground">
          {loading ? "対応が必要なタスクを確認しています…" : error ? "データを再読み込みしてください。" : needsAction ? text : "現在、対応が必要なタスクはありません。"}
        </span>
        <span className="flex flex-wrap items-end justify-between gap-2">
          <strong className={cn("text-2xl tabular-nums", needsAction ? "text-warning" : "text-muted-foreground")}>
            {loading || error ? "—" : count}
            <span className="ml-1 text-xs font-normal text-muted-foreground">件</span>
          </strong>
          <span className={cn("inline-flex items-center gap-1 text-xs", needsAction ? "text-foreground" : "text-muted-foreground")}>
            {loading ? "読み込み中" : needsAction ? "対応する" : "一覧を見る"}
            <ArrowRight aria-hidden="true" />
          </span>
        </span>
      </span>
    </Button>
  );
}
