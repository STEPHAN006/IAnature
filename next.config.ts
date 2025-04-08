import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ignore les erreurs ESLint
  },
  typescript: {
    ignoreBuildErrors: true, // ignore les erreurs TypeScript
  },
};

export default nextConfig;
