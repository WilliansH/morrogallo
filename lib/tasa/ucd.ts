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
 *   bcv         — el euro oficial del BCV, que es lo que la ley dice que vale.
 *   referencial — el euro calculado (dólar BCV × paridad) porque la fuente
 *                 del euro oficial no respondió. Va marcado "ref.".
 *
 * Nunca se muestra una cifra referencial como si fuera oficial.
 */

export type OrigenUcd = "publicada" | "bcv" | "referencial";

export type Ucd = {
  valor: number;
  fecha: string | null;
  fuente: string;
  origen: OrigenUcd;
};

/** El día en Caracas, "2026-10-30", para comparar fechas sin que la hora estorbe. */
const diaCaracas = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" });

function dia(iso: string | null | undefined) {
  if (!iso) return null;
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? null : diaCaracas.format(f);
}

export async function consultarUcd(): Promise<Ucd | null> {
  const [publicada, euro] = await Promise.all([valorActual(CLAVE_UCD), consultarEuroBcv()]);

  /*
   * La publicada manda mientras esté al día. La UCD cambia con cada tasa del
   * BCV: si un admin la cargó hace un mes y no la volvió a tocar, mostrarla
   * sería mostrar un número viejo como si fuera el de hoy. Cuando el BCV
   * publica una tasa de un día posterior, pasa a mandar la del BCV.
   */
  const diaPublicada = dia(publicada?.actualizado_en);
  const diaBcv = euro && !euro.calculado ? dia(euro.fecha) : null;
  const publicadaVigente =
    publicada && (!diaBcv || !diaPublicada || diaPublicada >= diaBcv);

  if (publicada && publicadaVigente) {
    return {
      valor: publicada.valor,
      fecha: publicada.actualizado_en,
      fuente: publicada.fuente ?? "Publicada por la administración del sitio",
      origen: "publicada",
    };
  }

  if (!euro) return null;

  if (!euro.calculado) {
    return {
      valor: euro.valor,
      fecha: euro.fecha,
      fuente: `La UCD es la moneda de mayor valor del BCV, el euro: ${euro.fuente.toLowerCase()}. Si la Alcaldía publica otro valor, manda el suyo.`,
      origen: "bcv",
    };
  }

  return {
    valor: euro.valor,
    fecha: euro.fecha,
    fuente: `Referencial. La UCD es la moneda de mayor valor del BCV, el euro: ${euro.fuente.toLowerCase()}. El valor oficial es el que publique la Alcaldía.`,
    origen: "referencial",
  };
}
