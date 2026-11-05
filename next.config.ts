import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // OAuth codes and email verification tokens must not appear in development request logs.
    logging: { incomingRequests: { ignore: [/^\/api\/admin\/google-calendar\/callback(?:\?|$)/, /^\/api\/accounts\/contact-emails\/verify(?:\?|$)/] } },
    // Development and production builds must never overwrite each other's manifests.
    distDir: process.env.RESERVATION_VALIDATION_BUILD === "1" ? ".next-check" : phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
