import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-40 flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}><span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox className="size-5" /></span><strong className="text-sm font-semibold">{title}</strong>{description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}{action}</div>;
}
