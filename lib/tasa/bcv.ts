/**
 * Consulta de la tasa oficial del BCV.
 *
 * Esto SIEMPRE corre del lado del servidor (API route o Server Component).
 * Nunca desde el navegador: las fuentes no mandan cabeceras CORS y, si cada
 * visita pidiera la tasa, nos comeríamos el rate limit en una tarde.
 *
 * Dos fuentes, se prueban en orden. Si la primera falla o devuelve algo que
 * no parece un número de bolívares, se pasa a la segunda. Si fallan las dos,
 * quien llame decide el respaldo (el último valor bueno guardado).
 */

export type TasaBcv = {
  /** Bolívares por dólar. */
  valor: number;
  /** Cuándo la publicó el BCV, en ISO. Puede venir vacío. */
  fecha: string | null;
  /** De dónde salió, para mostrarlo como fuente. */
  fuente: string;
};

const TIEMPO_LIMITE_MS = 5000;

/**
 * Cuánto vive la tasa en el cache de datos de Next.
 *
 * El BCV publica una sola vez por día hábil, por la tarde. Si cacheáramos 24
 * horas exactas desde la primera consulta de la mañana, estaríamos mostrando
 * la tasa de ayer durante toda la tarde. Seis horas son cuatro consultas al
 * día — nada para el rate limit de la fuente — y garantizan que el valor
 * nuevo aparezca el mismo día que sale. Si lo quieres exacto de un día,
 * cambia esta constante y ya.
 */
export const SEGUNDOS_CACHE = 6 * 60 * 60;

/** Un número de bolívares por dólar fuera de este rango es un error, no un dato. */
function esPlausible(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 && valor < 100_000;
}

async function pedirJson(url: string): Promise<unknown> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch(url, {
      signal: control.signal,
      headers: { accept: "application/json" },
      // Cache de datos de Next: todas las páginas del sitio comparten esta
      // misma respuesta, así que una visita más no es una consulta más.
      next: { revalidate: SEGUNDOS_CACHE },
    });

    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(corte);
  }
}

/** ve.dolarapi.com → { promedio, fechaActualizacion, fuente, nombre } */
async function desdeDolarApi(): Promise<TasaBcv | null> {
  const datos = (await pedirJson("https://ve.dolarapi.com/v1/dolares/oficial")) as
    | { promedio?: number; fechaActualizacion?: string }
    | null;

  if (!datos || !esPlausible(datos.promedio)) return null;

  return {
    valor: datos.promedio,
    fecha: datos.fechaActualizacion ?? null,
    fuente: "BCV vía ve.dolarapi.com",
  };
}

/**
 * pydolarve devuelve la fecha como "12/09/2026, 04:05 PM" — día primero, a la
 * venezolana. new Date() la leería al revés (9 de diciembre), así que la
 * armamos a mano. Venezuela es UTC-4 todo el año, no hay horario de verano.
 * Si el texto no calza con el formato esperado, preferimos no tener fecha
 * antes que tener una inventada.
 */
function fechaPyDolar(texto: unknown): string | null {
  if (typeof texto !== "string") return null;

  const m = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/
  );
  if (!m) return null;

  const [, dia, mes, anio, hora12, minuto, meridiano] = m;
  const hora = (Number(hora12) % 12) + (meridiano.toLowerCase() === "p" ? 12 : 0);

  return `${anio}-${mes}-${dia}T${String(hora).padStart(2, "0")}:${minuto}:00-04:00`;
}

type MonitorPyDolar = { price?: number; last_update?: string };

/**
 * pydolarve.org → { monitors: { usd: {...}, eur: {...}, ... } }
 *
 * El BCV publica varias monedas en la misma página, así que de aquí sale
 * tanto el dólar como el euro. Los nombres de las claves han cambiado entre
 * versiones de la API, por eso se prueban varias.
 */
async function desdePyDolar(claves: string[]): Promise<MonitorPyDolar | null> {
  const datos = (await pedirJson("https://pydolarve.org/api/v1/dollar?page=bcv")) as
    | { monitors?: Record<string, MonitorPyDolar> }
    | null;

  const monitores = datos?.monitors;
  if (!monitores) return null;

  for (const clave of claves) {
    const m = monitores[clave];
    if (m && esPlausible(m.price)) return m;
  }

  return null;
}

async function dolarDesdePyDolar(): Promise<TasaBcv | null> {
  const m = await desdePyDolar(["usd", "dolar", "usd_bcv"]);
  if (!m || !esPlausible(m.price)) return null;

  return {
    valor: m.price,
    fecha: fechaPyDolar(m.last_update),
    fuente: "BCV vía pydolarve.org",
  };
}

/**
 * Paridad euro/dólar del mercado internacional: cuántos dólares vale un euro.
 * Dos fuentes, las dos gratis y sin llave.
 */
async function paridadEurUsd(): Promise<number | null> {
  const a = (await pedirJson("https://open.er-api.com/v6/latest/EUR")) as
    | { rates?: { USD?: number } }
    | null;

  if (esParidad(a?.rates?.USD)) return a!.rates!.USD!;

  const b = (await pedirJson(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json"
  )) as { eur?: { usd?: number } } | null;

  return esParidad(b?.eur?.usd) ? b!.eur!.usd! : null;
}

function esParidad(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0.5 && valor < 3;
}

/**
 * Tipo de cambio del euro según el BCV — el número del que sale la UCD.
 *
 * El BCV no publica el euro en ninguna API abierta que responda desde
 * Venezuela (se probaron seis: pydolarve y exchangedyn no resuelven, dolarvzla
 * pide llave, y ve.dolarapi solo trae el dólar). Así que se calcula igual que
 * lo calcula el propio BCV: su tasa del dólar por la paridad euro/dólar del
 * mercado internacional.
 *
 * Por eso el resultado es REFERENCIAL y el sitio lo marca como tal. El valor
 * oficial de la UCD para un municipio es el que publique su superintendencia.
 */
export async function consultarEuroBcv(): Promise<TasaBcv | null> {
  const [dolar, paridad] = await Promise.all([consultarTasaBcv(), paridadEurUsd()]);

  if (!dolar || paridad === null) return null;

  const valor = dolar.valor * paridad;
  if (!esPlausible(valor)) return null;

  return {
    valor,
    // La fecha que importa es la del BCV, no la de la paridad.
    fecha: dolar.fecha,
    fuente: "Calculado: dólar del BCV × paridad euro/dólar",
  };
}

/**
 * Devuelve la tasa o null si ninguna fuente respondió algo usable.
 * Nunca lanza: una caída de la fuente no puede tumbar la portada.
 */
export async function consultarTasaBcv(): Promise<TasaBcv | null> {
  return (await desdeDolarApi()) ?? (await dolarDesdePyDolar());
}
