import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Una sesión por cuenta.
 *
 * Supabase lo ofrece solo desde el plan Pro, así que se hace a mano: al entrar
 * se guarda el id de la sesión nueva, y el proxy cierra cualquier sesión cuyo
 * id ya no sea ese. Gana el ingreso más reciente.
 */

export const TABLA_SESIONES = "sesiones_activas";

/**
 * El id de sesión viaja como claim `session_id` dentro del JWT. Se lee sin
 * librerías y sin verificar la firma: no hace falta, porque quien valida el
 * token es Supabase — aquí solo se compara un identificador.
 *
 * atob y TextDecoder en vez de Buffer: esto corre también en el proxy.
 */
export function idDeSesion(accessToken?: string | null): string | null {
  if (!accessToken) return null;

  const partes = accessToken.split(".");
  if (partes.length < 2) return null;

  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const datos = JSON.parse(new TextDecoder().decode(bytes)) as {
      session_id?: string;
    };

    return datos.session_id ?? null;
  } catch {
    return null;
  }
}

/** Marca esta sesión como la buena. Se llama al entrar y al confirmar la cuenta. */
export async function tomarSesion(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const id = idDeSesion(session?.access_token);
  if (!session?.user || !id) return;

  await supabase
    .from(TABLA_SESIONES)
    .upsert(
      { usuario_id: session.user.id, session_id: id, actualizado_en: new Date().toISOString() },
      { onConflict: "usuario_id" }
    );
}
