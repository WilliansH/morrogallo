"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CLAVE_UCD, leerNumero } from "@/lib/tasa/valores";

function volver(params: Record<string, string>): never {
  redirect(`/admin/ucd?${new URLSearchParams(params).toString()}`);
}

/**
 * Solo un admin entra aquí. Si no lo es, 404 en vez de "no autorizado": no
 * hace falta anunciarle a nadie que este panel existe.
 */
async function adminActual() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("es_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.es_admin) {
    notFound();
  }

  return { supabase, user };
}

export async function guardarUcd(formData: FormData) {
  const { supabase, user } = await adminActual();

  const valor = leerNumero(String(formData.get("valor") ?? ""));
  const fuente = String(formData.get("fuente") ?? "").trim();

  if (valor === null) {
    volver({ error: "Escribe la UCD como un número: 1.234,56 o 1234.56." });
  }

  if (!fuente) {
    volver({
      error: "Falta la fuente. Ningún valor entra al sitio sin decir de dónde salió.",
    });
  }

  // Siempre INSERT, nunca UPDATE: el valor viejo se queda como historial.
  const { error } = await supabase.from("valores_referencia").insert({
    clave: CLAVE_UCD,
    valor,
    fuente,
    actualizado_por: user.id,
  });

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/");
  revalidatePath("/admin/ucd");
  volver({ aviso: "UCD publicada. Ya se ve en el ticker." });
}
