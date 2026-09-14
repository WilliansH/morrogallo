import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { consultarEuroBcv } from "@/lib/tasa/bcv";
import { CLAVE_UCD } from "@/lib/tasa/valores";

import { guardarUcd } from "./acciones";

export const metadata = { title: "UCD" };

const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const boton =
  "cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";
const seccion = "border border-arena-200 bg-white/60 p-7";

const bolivares = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fechaLarga = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});

type Fila = {
  id: string;
  valor: number;
  fuente: string | null;
  actualizado_en: string | null;
};

function cuando(iso: string | null) {
  if (!iso) return "sin fecha";
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? "sin fecha" : fechaLarga.format(f);
}

export default async function PanelUcd({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const { error, aviso } = await searchParams;

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

  const { data: historial } = await supabase
    .from("valores_referencia")
    .select("id, valor, fuente, actualizado_en")
    .eq("clave", CLAVE_UCD)
    .order("actualizado_en", { ascending: false })
    .limit(10);

  const filas = (historial ?? []) as Fila[];
  const vigente = filas[0];

  // Para comparar antes de publicar: lo que da el BCV hoy.
  const euro = await consultarEuroBcv();

  return (
    <main className="flex-1 bg-arena-50">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <Link
          href="/"
          className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
        >
          ← Morrogallo
        </Link>

        <h1 className="font-display text-4xl mt-6">UCD</h1>
        <p className="text-sm text-tinta-600 mt-3 leading-relaxed">
          La Unidad de Cuenta Dinámica es el tipo de cambio de la moneda de
          mayor valor que publica el BCV — el euro — y con ella los estados y
          municipios calculan tributos, tasas, accesorios y sanciones. Mientras
          nadie publique un valor aquí, el ticker muestra el calculado del BCV
          marcado «ref.». Lo que cargues en esta página manda sobre el
          calculado: úsalo cuando la Alcaldía publique el suyo, que es el único
          que vale para Peñalver.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-8 border border-estrella-500/40 bg-white px-4 py-3 text-sm text-estrella-600"
          >
            {error}
          </p>
        ) : null}

        {aviso ? (
          <p
            role="status"
            className="mt-8 border border-monte-400/50 bg-white px-4 py-3 text-sm text-monte-600"
          >
            {aviso}
          </p>
        ) : null}

        {/* ---------------- Valor vigente ---------------- */}
        <section className={`${seccion} mt-10`}>
          <h2 className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-600">
            Vigente ahora
          </h2>

          {vigente ? (
            <>
              <p className="cifra text-4xl mt-4">
                {bolivares.format(vigente.valor)}{" "}
                <span className="text-tinta-400 text-2xl">Bs</span>
              </p>
              <p className="text-sm text-tinta-600 mt-3">
                {vigente.fuente ?? "sin fuente"} · {cuando(vigente.actualizado_en)}
              </p>
            </>
          ) : (
            <p className="cifra text-2xl text-tinta-400 mt-4">
              nadie ha publicado una
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-arena-200">
            <h3 className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
              Referencial del BCV
            </h3>
            {euro ? (
              <p className="text-sm text-tinta-600 mt-3">
                <span className="cifra text-tinta-900">
                  {bolivares.format(euro.valor)} Bs
                </span>{" "}
                — {euro.fuente}
                {euro.fecha ? ` · ${cuando(euro.fecha)}` : ""}.
                {vigente
                  ? " El ticker está mostrando el valor publicado, no este."
                  : " Es lo que el ticker está mostrando ahora, marcado «ref.»."}
              </p>
            ) : (
              <p className="text-sm text-tinta-600 mt-3">
                La fuente del BCV no respondió, así que no hay referencia que
                mostrar.
              </p>
            )}
          </div>
        </section>

        {/* ---------------- Publicar ---------------- */}
        <form action={guardarUcd} className={`${seccion} mt-6`}>
          <h2 className="font-display text-2xl">Publicar un valor nuevo</h2>
          <p className="text-sm text-tinta-600 mt-2 leading-relaxed">
            Esto no corrige el valor anterior: agrega uno nuevo y el viejo queda
            en el historial. Así se puede auditar de dónde salió cada cifra.
          </p>

          <div className="flex flex-col gap-5 mt-6">
            <div>
              <label className={etiqueta} htmlFor="valor">
                UCD en bolívares
              </label>
              <input
                id="valor"
                name="valor"
                type="text"
                inputMode="decimal"
                required
                autoComplete="off"
                placeholder="1.234,56"
                className={`${campo} cifra`}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="fuente">
                Fuente
              </label>
              <input
                id="fuente"
                name="fuente"
                type="text"
                required
                autoComplete="off"
                placeholder="Gaceta Oficial N.º 43.000 del 12/09/2026"
                className={campo}
              />
            </div>
          </div>

          <button className={`${boton} mt-6`} type="submit">
            Publicar
          </button>
        </form>

        {/* ---------------- Historial ---------------- */}
        <section className={`${seccion} mt-6`}>
          <h2 className="font-display text-2xl">Historial</h2>

          {filas.length === 0 ? (
            <p className="text-sm text-tinta-600 mt-4">
              Todavía no se ha publicado ninguna UCD.
            </p>
          ) : (
            <ul className="mt-5 flex flex-col divide-y divide-arena-200">
              {filas.map((fila) => (
                <li key={fila.id} className="py-4 flex items-baseline gap-4">
                  <span className="cifra text-lg">
                    {bolivares.format(fila.valor)}
                  </span>
                  <span className="text-sm text-tinta-600">
                    {fila.fuente ?? "sin fuente"}
                  </span>
                  <span className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 ml-auto whitespace-nowrap">
                    {cuando(fila.actualizado_en)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
