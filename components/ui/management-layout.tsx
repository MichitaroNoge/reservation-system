import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ManagementPage({ className, ...props }: ComponentProps<"main">) {
  return <main className={cn("w-full min-w-0 px-[18px] py-6 min-[761px]:px-9 min-[761px]:pb-[60px] min-[761px]:pt-[34px]", className)} {...props} />;
}
export function ListPanel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />;
}
export function ListToolbar({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-3 border-b border-border bg-background/40 px-5 py-4", className)} {...props} />;
}
export function ResultCount({ count, loading, error, className }: { count: number; loading?: boolean; error?: boolean; className?: string }) {
  return <div className={cn("ml-auto flex items-baseline gap-1 whitespace-nowrap text-xs text-muted-foreground", className)} aria-live="polite"><span>該当</span><strong className="text-[23px] font-semibold leading-none text-foreground">{loading || error ? "—" : count}</strong><span>件</span></div>;
}
