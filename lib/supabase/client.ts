import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente para el navegador. Hoy no lo usa nadie: todo el sitio corre en el
 * servidor con Server Actions, que es lo que hace que funcione sin JavaScript.
 *
 * Ojo si algún día se usa: NEXT_SUPABASE_* son variables de servidor, no
 * llevan el prefijo NEXT_PUBLIC_, así que no se incrustan en el bundle del
 * navegador y aquí llegarían vacías. Para usar este cliente habría que
 * publicar las dos como NEXT_PUBLIC_* también.
 */

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_ANON_KEY!
  );
}
