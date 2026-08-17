import type { NextConfig } from "next";

const useStandalone = process.env.NEXT_DISABLE_STANDALONE !== "1";

const sharedConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nbility.ai",
        pathname: "/logo.svg",
      },
    ],
  },
};

const nextConfig: NextConfig = useStandalone
  ? { ...sharedConfig, output: "standalone" }
  : sharedConfig;

export default nextConfig;
