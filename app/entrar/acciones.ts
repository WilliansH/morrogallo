"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { tomarSesion } from "@/lib/sesion-unica";
import { createClient } from "@/lib/supabase/server";

/** Origen real de la petición: sirve igual en localhost:3210 y en Vercel. */
async function origen() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3210";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function volver(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/entrar?${qs}`);
}

export async function iniciarSesion(formData: FormData) {
  const correo = String(formData.get("correo") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!correo || !clave) {
    volver({ error: "Faltan el correo o la contraseña.", modo: "entrar" });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (error) {
    volver({
      error:
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message,
      modo: "entrar",
    });
  }

  // Esta pasa a ser la sesión buena: cualquier otra abierta se cierra sola
  // en su próximo request.
  await tomarSesion(supabase);

  redirect("/");
}

export async function registrarse(formData: FormData) {
  const correo = String(formData.get("correo") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  const parroquiaId = String(formData.get("parroquia") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!correo || !clave) {
    volver({ error: "Faltan el correo o la contraseña.", modo: "registro" });
  }

  if (clave.length < 8) {
    volver({
      error: "La contraseña necesita al menos 8 caracteres.",
      modo: "registro",
    });
  }

  if (!parroquiaId) {
    volver({ error: "Elige tu parroquia.", modo: "registro" });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: correo,
    password: clave,
    options: {
      emailRedirectTo: `${await origen()}/auth/confirmar`,
      // Viaja en raw_user_meta_data. De aquí lo toma el trigger que crea
      // la fila en perfiles (supabase/perfil_al_registrarse.sql).
      data: { parroquia_id: parroquiaId, nombre_visible: nombre },
    },
  });

  if (error) {
    volver({ error: error.message, modo: "registro" });
  }

  volver({
    aviso:
      "Te mandamos un correo para confirmar la cuenta. Revisa también la carpeta de spam.",
    modo: "entrar",
  });
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
