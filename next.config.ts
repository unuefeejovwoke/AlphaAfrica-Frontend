import type { NextConfig } from "next"
import { imageRemotePatterns, securityHeaders } from "./lib/guardrails"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns(process.env.NODE_ENV === "production"),
  },
  // The icon packages export hundreds of icon modules from one barrel; this
  // makes the framework load only the icons a module actually imports
  // (ticket 22). Framework-level, so every icon import site benefits.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  },
  headers: () =>
    Promise.resolve([
      {
        source: "/(.*)",
        headers: securityHeaders(),
      },
    ]),
}

export default nextConfig
