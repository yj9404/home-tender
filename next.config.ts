import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
  // 상위 폴더에 다른 lockfile이 존재할 때 Turbopack이 워크스페이스 루트를 잘못 감지하는 문제 방지
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
