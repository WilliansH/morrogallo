import { NextResponse } from "next/server";

import { consultarTasaBcv, SEGUNDOS_CACHE } from "@/lib/tasa/bcv";

/**
 * GET /api/tasa — la tasa del BCV en JSON.
 *
 * Existe para poder verla sin abrir la portada (y para que cualquier cosa que
 * hagamos después la consuma sin repetir la lógica). El navegador nunca llama
 * a la fuente externa directamente: no manda CORS y nos comeríamos el rate
 * limit entre todas las visitas.
 */

export async function GET() {
  const tasa = await consultarTasaBcv();

  if (!tasa) {
    return NextResponse.json(
      { error: "Ninguna fuente respondió una tasa usable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(tasa, {
    headers: {
      "cache-control": `public, s-maxage=${SEGUNDOS_CACHE}, stale-while-revalidate=86400`,
    },
  });
}
