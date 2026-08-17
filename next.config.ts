import type { NextConfig } from "next";

const useStandalone = process.env.NEXT_DISABLE_STANDALONE !== "1";

const nextConfig: NextConfig = useStandalone
  ? { output: "standalone", cacheComponents: true }
  : { cacheComponents: true };

export default nextConfig;
