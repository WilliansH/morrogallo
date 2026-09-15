import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { idDeSesion, TABLA_SESIONES } from "@/lib/sesion-unica";

/** La ruta que cierra la sesión no puede quedar atrapada en su propio chequeo. */
const SALIDA = "/auth/salir";

/**
 * Refresca la sesión en cada request. Sin esto los tokens caducan y el
 * usuario aparece deslogueado a mitad de navegación.
 *
 * Ojo: no metas lógica entre createServerClient y getUser(). Cualquier
 * cosa en medio puede dejar la sesión a medio refrescar.
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * Una sesión por cuenta. Supabase solo lo ofrece desde el plan Pro, así que
   * se compara a mano: si el id de sesión de esta cookie ya no es el que quedó
   * guardado al último ingreso, esta es la sesión vieja y se manda a cerrar.
   */
  if (user && request.nextUrl.pathname !== SALIDA) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const actual = idDeSesion(session?.access_token);

    if (actual) {
      const { data: guardada, error: errorSesion } = await supabase
        .from(TABLA_SESIONES)
        .select("session_id")
        .eq("usuario_id", user.id)
        .maybeSingle();

      /*
       * Si la consulta falla (la tabla todavía no existe, un tropiezo de red)
       * no se toca nada: más vale dejar pasar a alguien que sacar al que sí
       * acaba de entrar. Sin esta guarda, un error de lectura haría que la
       * sesión vieja se declarara buena y tumbara a la nueva.
       */
      if (errorSesion) {
        return respuesta;
      }

      if (!guardada) {
        // Primera vez que se ve esta cuenta: esta sesión pasa a ser la buena.
        await supabase
          .from(TABLA_SESIONES)
          .upsert({ usuario_id: user.id, session_id: actual }, { onConflict: "usuario_id" });
      } else if (guardada.session_id !== actual) {
        const url = request.nextUrl.clone();
        url.pathname = SALIDA;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return respuesta;
}
