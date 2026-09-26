import type { NextConfig } from "next";

// Fail fast on startup/build when the public environment is invalid (US-FE-01 AC4).
import "./src/config/env";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
