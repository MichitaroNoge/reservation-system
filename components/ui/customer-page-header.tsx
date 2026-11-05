import type { ReactNode } from "react";
import Link from "next/link";

export function CustomerPageHeader({ children }: { children: ReactNode }) {
  return <header className="border-b border-border bg-card"><div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8"><Link href="/?customerMode=home" className="inline-flex items-center gap-3 text-foreground"><span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">R</span><strong className="text-base">Reserve</strong></Link><nav aria-label="お客様メニュー" className="flex flex-wrap items-center gap-3 text-sm text-primary">{children}</nav></div></header>;
}
