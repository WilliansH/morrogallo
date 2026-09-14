import { createClient } from "@/lib/supabase/server";

/**
 * Valores de referencia que carga un admin a mano (hoy: la UCD).
 *
 * Se leen de la vista v_valores_actuales, que devuelve la última fila por
 * clave. La tabla nunca se edita: un valor nuevo es una fila nueva, así que
 * el histórico queda completo.
 */

export const CLAVE_UCD = "ucd";

export type ValorReferencia = {
  clave: string;
  valor: number;
  fuente: string | null;
  actualizado_en: string | null;
};

export async function valorActual(clave: string): Promise<ValorReferencia | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_valores_actuales")
    .select("clave, valor, fuente, actualizado_en")
    .eq("clave", clave)
    // La vista devuelve una fila por clave, pero si algún día devuelve dos
    // preferimos la más reciente antes que un error en la portada.
    .order("actualizado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || typeof data.valor !== "number" || !Number.isFinite(data.valor)) {
    return null;
  }

  return data as ValorReferencia;
}

/**
 * Lee un número escrito por una persona en Venezuela: "1.234,56" es mil
 * doscientos treinta y cuatro con cincuenta y seis, no uno coma dos tres.
 * Acepta también "1234.56" por si alguien escribe a la gringa.
 * Devuelve null si no hay un número plausible; nunca adivina.
 */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, "");
  if (!limpio) return null;

  // "1.234,56" → la coma manda: los puntos son miles.
  // "1.234" sin coma también es mil doscientos treinta y cuatro: un punto
  // seguido de exactamente tres dígitos, repetido, solo puede ser separador
  // de miles. Cualquier otro punto se lee como decimal ("1234.56").
  const tieneComa = limpio.includes(",");
  const puntosDeMiles = /^\d{1,3}(\.\d{3})+$/.test(limpio);

  const normalizado = tieneComa
    ? limpio.replace(/\./g, "").replace(",", ".")
    : puntosDeMiles
      ? limpio.replace(/\./g, "")
      : limpio;

  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;

  const valor = Number(normalizado);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}
