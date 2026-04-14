import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
