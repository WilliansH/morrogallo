"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MAX_IMAGEN = 5 * 1024 * 1024; // 5 MB: el tope para quien sube sin JavaScript
const TIPOS = ["noticia", "resena", "foto"] as const;

function volver(params: Record<string, string>): never {
  redirect(`/?${new URLSearchParams(params).toString()}`);
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

/**
 * Sube una imagen al bucket y devuelve las dos URLs.
 *
 * Con JavaScript llegan dos archivos (mini y grande). Sin JavaScript
 * llega uno solo, el original: se usa para las dos cosas y se acabó, que es
 * mejor que no poder publicar.
 */
async function subirImagen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string,
  archivos: File[]
) {
  const utiles = archivos.filter((a) => a.size > 0 && a.type.startsWith("image/"));
  if (utiles.length === 0) return { url: null, mini: null, error: null };

  if (utiles.some((a) => a.size > MAX_IMAGEN)) {
    return { url: null, mini: null, error: "La imagen pesa más de 5 MB." };
  }

  const mini = utiles.find((a) => a.name.startsWith("mini")) ?? utiles[0];
  const grande = utiles.find((a) => a.name.startsWith("grande")) ?? utiles[0];
  const sello = Date.now();

  async function guardar(archivo: File, sufijo: string) {
    const extension =
      archivo.type === "image/webp" ? "webp" : archivo.type === "image/png" ? "png" : "jpg";
    const ruta = `${usuarioId}/pub-${sello}-${sufijo}.${extension}`;

    const { error } = await supabase.storage.from("fotos").upload(ruta, archivo, {
      contentType: archivo.type,
      upsert: true,
      // Un año. El nombre lleva la marca de tiempo, así que nunca cambia el
      // contenido de una ruta: quien ya vio la foto no la vuelve a bajar, y
      // eso es egress que no se gasta.
      cacheControl: "31536000",
    });

    if (error) return null;

    return supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  }

  const urlGrande = await guardar(grande, "grande");

  if (!urlGrande) {
    return { url: null, mini: null, error: "No se pudo subir la imagen." };
  }

  const urlMini = mini === grande ? urlGrande : await guardar(mini, "mini");

  return { url: urlGrande, mini: urlMini ?? urlGrande, error: null };
}

export async function publicar(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const parroquia = String(formData.get("parroquia") ?? "");

  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    volver({ error: "Elige si es una noticia, una reseña o una foto." });
  }

  if (titulo.length < 3) {
    volver({ error: "Ponle un título, aunque sea corto." });
  }

  if (!parroquia) {
    volver({ error: "Dinos de qué parroquia es." });
  }

  const archivos = formData.getAll("foto").filter((f): f is File => f instanceof File);
  const imagen = await subirImagen(supabase, user.id, archivos);

  if (imagen.error) {
    volver({ error: imagen.error });
  }

  if (tipo === "foto" && !imagen.url) {
    volver({ error: "Una foto sin foto no es una foto. Elige una imagen." });
  }

  const { error } = await supabase.from("publicaciones").insert({
    usuario_id: user.id,
    parroquia_id: parroquia,
    tipo,
    titulo,
    descripcion: descripcion || null,
    imagen_url: imagen.url,
    imagen_mini_url: imagen.mini,
  });

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/");
  volver({ aviso: "Publicado." });
}

/** Un voto por persona: lo garantiza la base, no esta función. */
export async function votar(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const publicacion = String(formData.get("publicacion") ?? "");
  const quitar = formData.get("quitar") === "1";

  if (!publicacion) {
    volver({ error: "No se supo qué publicación era." });
  }

  const { error } = quitar
    ? await supabase
        .from("votos")
        .delete()
        .eq("publicacion_id", publicacion)
        .eq("usuario_id", user.id)
    : await supabase
        .from("votos")
        .insert({ publicacion_id: publicacion, usuario_id: user.id });

  if (error && error.code !== "23505") {
    volver({ error: error.message });
  }

  revalidatePath("/");
  redirect("/");
}

/** Moderación: no borra, oculta. Lo permite la política admin_modera_publicacion. */
export async function ocultar(formData: FormData) {
  const { supabase } = await usuarioActual();

  const publicacion = String(formData.get("publicacion") ?? "");

  const { error } = await supabase
    .from("publicaciones")
    .update({ oculto: true })
    .eq("id", publicacion);

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/");
  volver({ aviso: "Publicación oculta. Sigue en la base, deja de mostrarse." });
}
