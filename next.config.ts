import type { NextConfig } from "next";

const url = process.env.NEXT_SUPABASE_URL;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /*
       * Por defecto una Server Action acepta 1 MB. Con JavaScript las fotos
       * llegan ya reducidas (~100 KB), pero sin JavaScript —o si alguien
       * aprieta "Subir" antes de que termine la compresión— llega el original
       * del celular, que pasa de 1 MB, y la subida moría con un error genérico.
       * 4 MB porque Vercel corta los cuerpos en 4,5 MB; las acciones rechazan
       * con un mensaje claro lo que pase de 4 MB.
       */
      bodySizeLimit: "4mb",
    },
  },
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
