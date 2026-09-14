import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos archivos estáticos e imágenes. El proxy solo refresca
     * la sesión; no bloquea rutas.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
