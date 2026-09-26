import type { NextConfig } from "next";

import { serverEnv } from "./src/config/env";

// Fail fast on startup/build when the environment is invalid (US-FE-01 AC4).
serverEnv();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
