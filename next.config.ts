import type { NextConfig } from "next";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    // Las fotos viven en el Storage de Supabase.
    remotePatterns: url
      ? [{ protocol: "https", hostname: new URL(url).hostname }]
      : [],
  },
};

export default nextConfig;
