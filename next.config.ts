import type { NextConfig } from "next"
import { imageRemotePatterns, securityHeaders } from "./lib/guardrails"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageRemotePatterns(process.env.NODE_ENV === "production"),
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
