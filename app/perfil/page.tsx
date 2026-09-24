import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * "Mi perfil" es el mismo perfil que ven los demás, con lo que subiste. Los
 * ajustes (foto, datos, contraseña, borrar la cuenta) viven detrás de la
 * tuerca, en /perfil/ajustes.
 */
export default async function MiPerfil() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? `/vecino/${user.id}` : "/entrar");
}
