import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Cierra esta sesión porque la cuenta entró en otro lado.
 *
 * scope "local" a propósito: cerrar global tumbaría también la sesión nueva,
 * que es justo la que queremos dejar viva.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect(
    `/entrar?${new URLSearchParams({
      aviso:
        "Tu cuenta entró desde otro dispositivo, así que aquí se cerró la sesión. Solo puede estar abierta en un lugar a la vez.",
      modo: "entrar",
    }).toString()}`
  );
}
