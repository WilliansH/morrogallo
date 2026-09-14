import { consultarEuroBcv } from "./bcv";
import { CLAVE_UCD, valorActual } from "./valores";

/**
 * La UCD — Unidad de Cuenta Dinámica — es con lo que estados y municipios
 * calculan tributos, tasas, accesorios y sanciones: unidad de medida por
 * moneda de mayor valor. Su valor no lo decide nadie a dedo, es el tipo de
 * cambio de la moneda de mayor valor que publica el BCV (el euro).
 *
 * Aun así, el valor que vale para un municipio es el que publique su
 * superintendencia, no el que calculemos nosotros. Por eso hay dos orígenes y
 * el sitio siempre dice cuál está mostrando:
 *
 *   publicada   — la cargó un admin en /admin/ucd. Manda siempre.
 *   referencial — la calculamos del euro del BCV porque nadie ha cargado una.
 *
 * Nunca se muestra una cifra referencial como si fuera oficial.
 */

export type OrigenUcd = "publicada" | "referencial";

export type Ucd = {
  valor: number;
  fecha: string | null;
  fuente: string;
  origen: OrigenUcd;
};

export async function consultarUcd(): Promise<Ucd | null> {
  const publicada = await valorActual(CLAVE_UCD);

  if (publicada) {
    return {
      valor: publicada.valor,
      fecha: publicada.actualizado_en,
      fuente: publicada.fuente ?? "Publicada por la administración del sitio",
      origen: "publicada",
    };
  }

  const euro = await consultarEuroBcv();
  if (!euro) return null;

  return {
    valor: euro.valor,
    fecha: euro.fecha,
    fuente: `Referencial. La UCD es la moneda de mayor valor del BCV, el euro: ${euro.fuente.toLowerCase()}. El valor oficial es el que publique la Alcaldía.`,
    origen: "referencial",
  };
}
