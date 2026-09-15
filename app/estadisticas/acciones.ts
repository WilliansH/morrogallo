"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function volver(params: Record<string, string>): never {
  redirect(`/estadisticas?${new URLSearchParams(params).toString()}`);
}

/**
 * Las cifras del municipio las carga el equipo, no la comunidad: la gente
 * participa en el feed con fotos, reseñas y respaldos.
 *
 * Esta comprobación es para dar un mensaje decente, no para proteger. Quien
 * protege es la base: las políticas de public.estadisticas solo dejan escribir
 * a un admin, así que llamar a la API por fuera del sitio tampoco sirve.
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
    volver({
      error:
        "Las cifras del municipio las carga el equipo del portal. Lo del pueblo se publica en el feed.",
    });
  }

  return { supabase, user };
}

/**
 * Cargar un dato.
 *
 * No edita nada: cada carga es una fila nueva, y la anterior queda para
 * comparar. La fuente es obligatoria — es la regla que sostiene todo el sitio:
 * ninguna cifra se presenta como cierta porque sí.
 */
export async function aportarEstadistica(formData: FormData) {
  const { supabase, user } = await adminActual();

  const tipo = String(formData.get("tipo") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();
  const fuente = String(formData.get("fuente") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const ambito = String(formData.get("ambito") ?? "");
  const estado = String(formData.get("estado") ?? "en_revision");

  if (tipo.length < 3) {
    volver({ error: "Dile qué mides: «población», «centros de salud», lo que sea." });
  }

  if (!valor) {
    volver({ error: "Falta el dato." });
  }

  if (fuente.length < 4) {
    volver({
      error:
        "Falta la fuente. Sin decir de dónde salió el número, el dato no entra: esa es la regla del sitio.",
    });
  }

  if (estado !== "verificado" && estado !== "en_revision") {
    volver({ error: "Ese sello no existe." });
  }

  // El ámbito viene como "municipio:<id>" o "parroquia:<id>".
  const [clase, id] = ambito.split(":");

  if ((clase !== "municipio" && clase !== "parroquia") || !id) {
    volver({ error: "Elige a qué corresponde el dato." });
  }

  let municipioId = clase === "municipio" ? id : null;
  const parroquiaId = clase === "parroquia" ? id : null;

  if (parroquiaId) {
    const { data: parroquia } = await supabase
      .from("parroquias")
      .select("municipio_id")
      .eq("id", parroquiaId)
      .maybeSingle();

    municipioId = parroquia?.municipio_id ?? null;

    if (!municipioId) {
      volver({ error: "Esa parroquia no tiene municipio asociado." });
    }
  }

  const { error } = await supabase.from("estadisticas").insert({
    municipio_id: municipioId,
    parroquia_id: parroquiaId,
    tipo,
    valor,
    fuente,
    // Un dato sin fecha es un dato sin contexto, pero no todos la tienen.
    fecha_dato: fecha || null,
    estado,
    creado_por: user.id,
  });

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/estadisticas");
  revalidatePath("/penalver");
  revalidatePath("/");
  volver({
    aviso:
      estado === "verificado"
        ? "Dato publicado y verificado."
        : "Dato publicado, marcado en revisión.",
  });
}

/**
 * Cambiar el sello de una cifra: verificada o en revisión.
 *
 * Es lo único que se actualiza de una estadística, y solo lo hace un admin.
 * Sirve para lo que ya está cargado con fuente indirecta —una enciclopedia
 * citando al INE, por ejemplo— que no se puede presentar como oficial hasta
 * tener el documento en la mano.
 */
export async function cambiarSello(formData: FormData) {
  const { supabase } = await adminActual();

  const estadisticaId = String(formData.get("estadistica") ?? "");
  const estado = String(formData.get("estado") ?? "");

  if (!estadisticaId) {
    volver({ error: "No se supo a qué dato te referías." });
  }

  if (estado !== "verificado" && estado !== "en_revision") {
    volver({ error: "Ese sello no existe." });
  }

  const { error } = await supabase
    .from("estadisticas")
    .update({ estado })
    .eq("id", estadisticaId);

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/estadisticas");
  revalidatePath("/penalver");
  revalidatePath("/");
  volver({
    aviso: estado === "verificado" ? "Cifra verificada." : "Cifra devuelta a revisión.",
  });
}
