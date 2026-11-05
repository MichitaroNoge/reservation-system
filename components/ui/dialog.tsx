"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = React.forwardRef<React.ElementRef<typeof Primitive.Title>, React.ComponentPropsWithoutRef<typeof Primitive.Title>>(({ className, ...props }, ref) => <Primitive.Title ref={ref} className={cn("text-lg font-semibold leading-6", className)} {...props} />);
DialogTitle.displayName = Primitive.Title.displayName;
export const DialogDescription = React.forwardRef<React.ElementRef<typeof Primitive.Description>, React.ComponentPropsWithoutRef<typeof Primitive.Description>>(({ className, ...props }, ref) => <Primitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
DialogDescription.displayName = Primitive.Description.displayName;
export const DialogContent = React.forwardRef<React.ElementRef<typeof Primitive.Content>, React.ComponentPropsWithoutRef<typeof Primitive.Content>>(({ className, children, ...props }, ref) => (
  <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/40" /><Primitive.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-lg focus:outline-none", className)} {...props}>{children}</Primitive.Content></Primitive.Portal>
));
DialogContent.displayName = "DialogContent";
