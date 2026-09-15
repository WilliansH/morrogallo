"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function volver(params: Record<string, string>): never {
  redirect(`/estadisticas?${new URLSearchParams(params).toString()}`);
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
 * Aportar un dato.
 *
 * No edita nada: cada aporte es una fila nueva, y el estado lo pone la base.
 * La fuente es obligatoria — es la regla que sostiene todo el sitio: ninguna
 * cifra se presenta como cierta porque sí.
 */
export async function aportarEstadistica(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const tipo = String(formData.get("tipo") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();
  const fuente = String(formData.get("fuente") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const ambito = String(formData.get("ambito") ?? "");

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
    creado_por: user.id,
    // estado y corroboraciones_count los pone la base, no la app.
  });

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/estadisticas");
  revalidatePath("/");
  volver({ aviso: "Aporte publicado. Ahora les toca a los vecinos corroborarlo." });
}

/**
 * Corroborar o poner en duda un dato.
 *
 * La app solo inserta la fila. Todo lo demás lo hace la base:
 * trg_bloquear_autocorroboracion impide corroborarse a uno mismo y
 * trg_recalcular_estado lleva la cuenta y mueve el estado (tres corroboraciones
 * verifican, un reporte devuelve a revisión). Duplicar esa lógica aquí sería
 * tener dos verdades.
 */
export async function corroborar(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const estadisticaId = String(formData.get("estadistica") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (!estadisticaId) {
    volver({ error: "No se supo a qué dato te referías." });
  }

  if (tipo !== "corrobora" && tipo !== "reporta") {
    volver({ error: "Acción desconocida." });
  }

  const { error } = await supabase.from("corroboraciones").insert({
    estadistica_id: estadisticaId,
    usuario_id: user.id,
    tipo,
    comentario: comentario || null,
  });

  if (error) {
    const mensaje = error.message.toLowerCase();

    if (mensaje.includes("autocorrobor") || mensaje.includes("propio")) {
      volver({ error: "No puedes corroborar tu propio aporte." });
    }

    if (error.code === "23505") {
      volver({ error: "Ya te habías pronunciado sobre ese dato." });
    }

    volver({ error: error.message });
  }

  revalidatePath("/estadisticas");
  revalidatePath("/");
  volver({
    aviso:
      tipo === "corrobora"
        ? "Corroborado. Con tres como la tuya, el dato queda verificado."
        : "Anotado. El dato vuelve a revisión para que lo miren otros.",
  });
}

/** Retirar lo que uno dijo sobre un dato. La política DELETE solo deja borrar lo propio. */
export async function retirarCorroboracion(formData: FormData) {
  const { supabase, user } = await usuarioActual();

  const estadisticaId = String(formData.get("estadistica") ?? "");

  if (!estadisticaId) {
    volver({ error: "No se supo a qué dato te referías." });
  }

  const { error } = await supabase
    .from("corroboraciones")
    .delete()
    .eq("estadistica_id", estadisticaId)
    .eq("usuario_id", user.id);

  if (error) {
    volver({ error: error.message });
  }

  revalidatePath("/estadisticas");
  revalidatePath("/");
  volver({ aviso: "Retirado." });
}
