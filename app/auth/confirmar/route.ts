import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { tomarSesion } from "@/lib/sesion-unica";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace que llega por correo. Supabase manda token_hash y type;
 * aquí se canjean por una sesión y se manda al usuario a la portada.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      // Confirmar la cuenta abre sesión: esta pasa a ser la buena.
      await tomarSesion(supabase);
      redirect("/?bienvenida=1");
    }
  }

  redirect(
    "/entrar?error=" +
      encodeURIComponent(
        "El enlace de confirmación no sirve o ya venció. Pide uno nuevo entrando con tu correo."
      )
  );
}
