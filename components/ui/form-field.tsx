"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Label } from "./label";

const FieldContext = createContext<{ id: string; errorId?: string; invalid: boolean; required: boolean } | null>(null);

/** One labelled control, with its validation message linked for assistive technology. */
export function FormField({ label, required = false, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return <FieldContext.Provider value={{ id, errorId, invalid: Boolean(error), required }}>
    <div className="grid min-w-0 content-start gap-2">
      <Label htmlFor={id} className="flex items-center gap-2">{label}{required && <> <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">必須</span></>}</Label>
      {children}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </FieldContext.Provider>;
}

export function useFormField() { return useContext(FieldContext); }
