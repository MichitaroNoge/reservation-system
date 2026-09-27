"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return <Sonner position="bottom-right" closeButton richColors toastOptions={{ duration: 3500 }} />;
}
