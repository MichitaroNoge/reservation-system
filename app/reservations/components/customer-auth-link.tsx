"use client";

import Link from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "prefetch" | "onNavigate"> & {
  href: "/login" | "/register";
};

export const CustomerAuthLink = forwardRef<HTMLAnchorElement, Props>(({ href, ...props }, ref) => (
  <Link {...props} ref={ref} href={href} prefetch={false} onNavigate={event => {
    // The legacy portal synchronizes its own URL. Start auth pages with fresh state.
    event.preventDefault();
    window.location.assign(href);
  }} />
));
CustomerAuthLink.displayName = "CustomerAuthLink";
