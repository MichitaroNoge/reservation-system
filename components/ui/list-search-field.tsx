"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared appearance for reservation, task and inquiry list searches. */
export function ListSearchField({ className, ...props }: ComponentProps<"input">) {
  return (
    <label data-ui="list-search" className={cn("flex h-[42px] w-full min-w-0 items-center rounded-lg border border-input bg-card px-3 text-muted-foreground shadow-none focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 sm:w-80", className)}>
      <div className="flex h-full w-full min-w-0 items-center">
        <Search data-ui="list-search-icon" aria-hidden="true" className="size-[15px] shrink-0" />
        <input data-ui="list-search-input" type="text" className="h-full w-full min-w-0 border-0 bg-transparent p-0 pl-[9px] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50" {...props} />
      </div>
    </label>
  );
}
