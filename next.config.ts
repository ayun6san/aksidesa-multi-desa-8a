import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.space.z.ai",
  ],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
