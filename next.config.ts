import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // OAuth authorization codes must not appear in development request logs.
    logging: { incomingRequests: { ignore: [/^\/api\/admin\/google-calendar\/callback(?:\?|$)/] } },
    // Development and production builds must never overwrite each other's manifests.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
