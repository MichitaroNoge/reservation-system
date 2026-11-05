import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive", className)} {...props} />
));
Select.displayName = "Select";

export function ListFilter({ label, children, className, ...props }: React.ComponentProps<"select"> & { label: string }) {
  return <label className={cn("flex h-[42px] w-full min-w-0 items-center gap-3 rounded-lg border border-input bg-card px-3 text-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:w-44", className)}><span className="shrink-0 text-muted-foreground">{label}</span><Select {...props} aria-label={props["aria-label"] ?? label} className="h-full flex-1 rounded-none border-0 bg-transparent p-0 text-xs focus-visible:ring-0" >{children}</Select></label>;
}
