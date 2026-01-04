import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.13.100',
    '192.168.13.2',
  ],
};

export default nextConfig;
