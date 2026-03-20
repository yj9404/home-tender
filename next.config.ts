import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Just in case, as the build results showed some warnings
  }
};

export default nextConfig;
