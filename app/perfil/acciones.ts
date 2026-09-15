"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MAX_FOTO = 5 * 1024 * 1024; // 5 MB antes de comprimir

function volver(params: Record<string, string>) {
  redirect(`/perfil?${new URLSearchParams(params).toString()}`);
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

export async function guardarDatos(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const parroquia = String(formData.get("parroquia") ?? "");

  const { error } = await supabase
    .from("perfiles")
    .update({
      nombre_visible: nombre || null,
      telefono: telefono || null,
      direccion: direccion || null,
      parroquia_id: parroquia || null,
    })
    .eq("id", user.id);

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/perfil");
  revalidatePath("/");
  volver({ aviso: "Datos guardados." });
}

/** De la URL pública saca la ruta dentro del bucket, para poder borrarla. */
function rutaDe(url: string | null | undefined) {
  if (!url) return null;
  const marca = "/object/public/fotos/";
  const i = url.indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}

/**
 * Subir la foto de perfil.
 *
 * Guarda dos: la de 512px para el panel y un avatar de 96px, que es el que
 * sale en el feed y en la barra. Antes el feed bajaba la foto de 512px para
 * mostrarla a 32 píxeles, veinte veces por pantalla: pesaba más que todas las
 * miniaturas de las publicaciones juntas.
 *
 * Y borra las anteriores: si no, cada cambio de foto deja un archivo ocupando
 * storage para siempre que ya nadie va a ver.
 */
export async function subirFoto(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const archivos = formData
    .getAll("foto")
    .filter(
      (a): a is File => a instanceof File && a.size > 0 && a.type.startsWith("image/")
    );

  if (archivos.length === 0) {
    volver({ error: "Elige una imagen primero." });
    return;
  }

  if (archivos.some((a) => a.size > MAX_FOTO)) {
    volver({ error: "La imagen pesa más de 5 MB. Prueba con una más liviana." });
    return;
  }

  // Con JavaScript llegan dos archivos; sin JavaScript llega el original y
  // sirve para las dos cosas.
  const mini = archivos.find((a) => a.name.startsWith("mini")) ?? archivos[0];
  const grande = archivos.find((a) => a.name.startsWith("grande")) ?? archivos[0];
  const sello = Date.now();

  async function guardar(archivo: File, sufijo: string) {
    const extension =
      archivo.type === "image/webp" ? "webp" : archivo.type === "image/png" ? "png" : "jpg";
    const ruta = `${user.id}/perfil-${sello}-${sufijo}.${extension}`;

    const { error } = await supabase.storage.from("fotos").upload(ruta, archivo, {
      contentType: archivo.type,
      upsert: true,
      // Un año: la ruta lleva la marca de tiempo, así que su contenido nunca
      // cambia. Quien ya la vio no la vuelve a bajar.
      cacheControl: "31536000",
    });

    if (error) return null;

    return supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  }

  const { data: anterior } = await supabase
    .from("perfiles")
    .select("foto_url, foto_mini_url")
    .eq("id", user.id)
    .maybeSingle();

  const urlGrande = await guardar(grande, "grande");

  if (!urlGrande) {
    volver({ error: "No se pudo subir la foto." });
    return;
  }

  const urlMini = mini === grande ? urlGrande : ((await guardar(mini, "mini")) ?? urlGrande);

  const { error } = await supabase
    .from("perfiles")
    .update({ foto_url: urlGrande, foto_mini_url: urlMini })
    .eq("id", user.id);

  if (error) {
    volver({ error: error.message });
    return;
  }

  const viejas = [rutaDe(anterior?.foto_url), rutaDe(anterior?.foto_mini_url)].filter(
    (r): r is string => Boolean(r)
  );

  if (viejas.length > 0) {
    // Si la política de storage no deja borrar, no pasa nada: la foto nueva
    // ya quedó guardada y eso es lo que importa.
    await supabase.storage.from("fotos").remove(viejas);
  }

  revalidatePath("/perfil");
  revalidatePath("/");
  volver({ aviso: "Foto actualizada." });
}

export async function cambiarClave(formData: FormData) {
  const { supabase } = await usuarioActual();

  const clave = String(formData.get("clave") ?? "");
  const repetida = String(formData.get("clave2") ?? "");

  if (clave.length < 8) {
    volver({ error: "La contraseña necesita al menos 8 caracteres." });
  }

  if (clave !== repetida) {
    volver({ error: "Las dos contraseñas no coinciden." });
  }

  const { error } = await supabase.auth.updateUser({ password: clave });

  if (error) {
    volver({ error: error.message });
  }

  volver({ aviso: "Contraseña cambiada." });
}
