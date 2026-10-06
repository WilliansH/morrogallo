"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vuelve a la página de la publicación, al pie de los comentarios. */
function volver(publicacion: string, params: Record<string, string> = {}): never {
  const q = new URLSearchParams(params).toString();
  const base = UUID.test(publicacion) ? `/p/${publicacion}` : "/";
  redirect(`${base}${q ? `?${q}` : ""}#comentarios`);
}

async function usuarioActual() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  return { supabase, user };
}

function refrescar(publicacion: string) {
  revalidatePath(`/p/${publicacion}`);
  revalidatePath("/");
}

/**
 * Dejar un comentario. Quién puede, el tope por hora y el largo los decide la
 * base (supabase/comentarios.sql); aquí solo se dan mensajes decentes.
 */
export async function comentar(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const publicacion = String(formData.get("publicacion") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const clave = String(formData.get("clave") ?? "").trim();

  if (!UUID.test(publicacion)) {
    volver(publicacion, { error: "No se supo en qué publicación comentabas." });
  }

  if (!texto) {
    volver(publicacion, { error: "El comentario está vacío." });
  }

  if (texto.length > 1000) {
    volver(publicacion, { error: "El comentario pasa de 1.000 letras. Recórtalo un poco." });
  }

  const { error } = await supabase.from("comentarios").insert({
    publicacion_id: publicacion,
    usuario_id: user.id,
    texto,
    clave_envio: UUID.test(clave) ? clave : null,
  });

  // 23505: el mismo envío llegó dos veces (doble clic). Ya está guardado.
  if (error && error.code !== "23505") {
    volver(publicacion, {
      error: error.message.includes("row-level security")
        ? "Esta publicación ya no recibe comentarios."
        : error.message,
    });
  }

  refrescar(publicacion);
  volver(publicacion);
}

/** Lo borra su autor o el dueño de la publicación. Lo permite la política, no esto. */
export async function borrarComentario(formData: FormData) {
  const { supabase } = await usuarioActual();

  const publicacion = String(formData.get("publicacion") ?? "");
  const comentario = String(formData.get("comentario") ?? "");

  const { data, error } = await supabase
    .from("comentarios")
    .delete()
    .eq("id", comentario)
    .select("id");

  if (error || !data || data.length === 0) {
    volver(publicacion, { error: "No se pudo borrar ese comentario." });
  }

  refrescar(publicacion);
  volver(publicacion, { aviso: "Comentario borrado." });
}

/** Moderación: el admin oculta, no borra. */
export async function ocultarComentario(formData: FormData) {
  const { supabase } = await usuarioActual();

  const publicacion = String(formData.get("publicacion") ?? "");
  const comentario = String(formData.get("comentario") ?? "");

  const { data, error } = await supabase
    .from("comentarios")
    .update({ oculto: true })
    .eq("id", comentario)
    .select("id");

  if (error || !data || data.length === 0) {
    volver(publicacion, { error: "No se pudo ocultar ese comentario." });
  }

  refrescar(publicacion);
  volver(publicacion, { aviso: "Comentario oculto." });
}
