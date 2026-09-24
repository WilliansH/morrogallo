"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rutasDe } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/server";

/**
 * El dueño borra una publicación suya: la fila, sus respaldos y sus dos
 * fotos. No es lo mismo que ocultar (eso es del admin, y la deja en la base).
 *
 * Primero la base y después las fotos: si falla el storage queda un archivo
 * huérfano, que es menos malo que una publicación con la foto rota.
 */
export async function borrarPublicacion(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const id = String(formData.get("publicacion") ?? "");
  const volverA = `/vecino/${user.id}`;

  const { data: pub } = await supabase
    .from("publicaciones")
    .select("imagen_url, imagen_mini_url")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();

  // La que decide si es tuya es la base; esto es solo para saber qué fotos borrar.
  const { error } = await supabase.rpc("borrar_publicacion", { p_id: id });

  if (error) {
    redirect(`${volverA}?${new URLSearchParams({ error: error.message }).toString()}`);
  }

  const fotos = rutasDe(pub?.imagen_url, pub?.imagen_mini_url);

  if (fotos.length > 0) {
    await supabase.storage.from("fotos").remove(fotos);
  }

  revalidatePath("/");
  revalidatePath(volverA);
  redirect(`${volverA}?${new URLSearchParams({ aviso: "Publicación borrada." }).toString()}`);
}
