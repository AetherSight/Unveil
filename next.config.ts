import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.13.*',
    "ffxiv.ricterz.me",
    "as.ffxiv.ai"
  ],
};

export default nextConfig;
