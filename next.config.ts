import type { NextConfig } from "next";

const url = process.env.NEXT_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    /*
     * Las fotos viven en el Storage de Supabase. Esto solo hace falta para
     * las imágenes que pasan por el optimizador de Next; las del feed y los
     * avatares van con unoptimized porque ya salen del navegador en el
     * tamaño correcto, y así tampoco gastan transformaciones de Vercel.
     */
    remotePatterns: url
      ? [{ protocol: "https", hostname: new URL(url).hostname }]
      : [],
  },
};

export default nextConfig;
