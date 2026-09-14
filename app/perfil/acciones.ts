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

export async function subirFoto(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const archivo = formData.get("foto");

  if (!(archivo instanceof File) || archivo.size === 0) {
    volver({ error: "Elige una imagen primero." });
    return;
  }

  if (!archivo.type.startsWith("image/")) {
    volver({ error: "Ese archivo no es una imagen." });
    return;
  }

  if (archivo.size > MAX_FOTO) {
    volver({
      error: "La imagen pesa más de 5 MB. Prueba con una más liviana.",
    });
    return;
  }

  const extension = archivo.type === "image/png" ? "png" : "jpg";
  const ruta = `${user.id}/perfil-${Date.now()}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from("fotos")
    .upload(ruta, archivo, { contentType: archivo.type, upsert: true });

  if (errorSubida) {
    volver({ error: `No se pudo subir la foto: ${errorSubida.message}` });
    return;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("fotos").getPublicUrl(ruta);

  const { error } = await supabase
    .from("perfiles")
    .update({ foto_url: publicUrl })
    .eq("id", user.id);

  if (error) {
    volver({ error: error.message });
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
