import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
