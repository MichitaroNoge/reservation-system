"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export const DialogContent = React.forwardRef<React.ElementRef<typeof Primitive.Content>, React.ComponentPropsWithoutRef<typeof Primitive.Content>>(({ className, children, ...props }, ref) => (
  <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/40" /><Primitive.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-background text-foreground shadow-lg focus:outline-none", className)} {...props}>{children}</Primitive.Content></Primitive.Portal>
));
DialogContent.displayName = "DialogContent";
