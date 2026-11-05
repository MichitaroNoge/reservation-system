"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormField } from "./form-field";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  const field = useFormField();
  return <input ref={ref} {...props} id={props.id ?? field?.id} aria-required={props["aria-required"] ?? (field?.required || undefined)} aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)} aria-describedby={[props["aria-describedby"], field?.errorId].filter(Boolean).join(" ") || undefined} className={cn("flex h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50", className)} />;
});
Input.displayName = "Input";
