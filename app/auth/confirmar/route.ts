import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { tomarSesion } from "@/lib/sesion-unica";
import { createClient } from "@/lib/supabase/server";

function aEntrar(params: Record<string, string>): never {
  redirect(`/entrar?${new URLSearchParams({ modo: "entrar", ...params }).toString()}`);
}

/**
 * Destino del enlace que llega por correo. Puede llegar de dos formas:
 *
 *   ?code=…              — la plantilla de correo que trae Supabase por
 *                          defecto ({{ .ConfirmationURL }}). Supabase ya
 *                          confirmó el correo ANTES de mandar aquí; solo falta
 *                          canjear el código por una sesión.
 *   ?token_hash=…&type=… — una plantilla propia (cuando haya SMTP).
 *
 * Antes solo se atendía la segunda, así que con la plantilla por defecto todo
 * enlace caía en "ya venció" aunque la cuenta sí había quedado confirmada.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorCode = searchParams.get("error_code");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await tomarSesion(supabase);
      redirect("/?bienvenida=1");
    }

    // El canje falla si el enlace se abre en otro navegador (el celular, la
    // app de Gmail) que no es donde se hizo el registro. Pero el correo ya
    // quedó confirmado: basta con entrar.
    aEntrar({ aviso: "Tu correo quedó confirmado. Entra con tu correo y tu contraseña." });
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      await tomarSesion(supabase);
      redirect("/?bienvenida=1");
    }
  }

  aEntrar({
    error:
      errorCode === "otp_expired"
        ? "Ese enlace ya venció o ya se usó. Entra con tu correo y tu contraseña: si la cuenta no está confirmada, te mandamos un enlace nuevo."
        : "El enlace no sirvió. Entra con tu correo y tu contraseña: si la cuenta no está confirmada, te mandamos un enlace nuevo.",
  });
}
