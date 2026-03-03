import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ethers"],
  turbopack: {},
};

export default nextConfig;
