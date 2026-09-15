import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { aportarEstadistica, corroborar, retirarCorroboracion } from "./acciones";

export const metadata = {
  title: "Estadísticas",
  description:
    "Cifras del Municipio Fernando de Peñalver con su fuente, corroboradas por los vecinos.",
};

const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const boton =
  "cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";
const seccion = "border border-arena-200 bg-white/60 p-7";

const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});

/**
 * Los nombres de los estados los define un enum en la base. Aquí solo se
 * traducen a algo legible; si aparece uno que no conocemos, se muestra tal
 * cual en vez de inventarle una etiqueta.
 */
const SELLOS: Record<string, { texto: string; clase: string }> = {
  sin_datos: { texto: "Sin datos", clase: "text-tinta-400 border-arena-200" },
  en_revision: { texto: "En revisión", clase: "text-estrella-600 border-estrella-500/40" },
  verificado: { texto: "Verificado", clase: "text-monte-600 border-monte-400/50" },
};

function Sello({ estado }: { estado: string | null }) {
  const sello = (estado && SELLOS[estado]) || {
    texto: estado ?? "sin estado",
    clase: "text-tinta-400 border-arena-200",
  };

  return (
    <span
      className={`cifra text-[10px] uppercase tracking-[0.14em] border px-3 py-1 ${sello.clase}`}
    >
      {sello.texto}
    </span>
  );
}

const botonChico =
  "cifra text-[11px] uppercase tracking-[0.14em] border px-4 py-2 transition-colors";

/**
 * Corroborar o poner en duda. Nadie corrobora su propio aporte — lo impide un
 * trigger en la base, y aquí ni siquiera se ofrece.
 */
function Opinar({
  id,
  hayUsuario,
  esMio,
  yaDije,
}: {
  id: string;
  hayUsuario: boolean;
  esMio: boolean;
  yaDije: string | null;
}) {
  if (!hayUsuario) return null;

  if (esMio) {
    return (
      <p className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 mt-5">
        Tu aporte
      </p>
    );
  }

  if (yaDije) {
    return (
      <form action={retirarCorroboracion} className="mt-5 flex items-center gap-4">
        <input type="hidden" name="estadistica" value={id} />
        <span className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
          {yaDije === "corrobora" ? "Lo corroboraste" : "Lo pusiste en duda"}
        </span>
        <button
          type="submit"
          className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 underline transition-colors"
        >
          Retirar
        </button>
      </form>
    );
  }

  return (
    <form action={corroborar} className="mt-5 flex flex-wrap items-center gap-3">
      <input type="hidden" name="estadistica" value={id} />
      <input
        name="comentario"
        type="text"
        autoComplete="off"
        placeholder="Comentario (opcional)"
        className="flex-1 min-w-[12rem] border border-arena-200 bg-white px-3 py-2 text-sm text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none"
      />
      <button
        type="submit"
        name="tipo"
        value="corrobora"
        className={`${botonChico} border-monte-400/50 text-monte-600 hover:border-monte-600`}
      >
        Corroborar
      </button>
      <button
        type="submit"
        name="tipo"
        value="reporta"
        className={`${botonChico} border-arena-200 text-tinta-600 hover:border-estrella-500/60 hover:text-estrella-600`}
      >
        Poner en duda
      </button>
    </form>
  );
}

type Estadistica = {
  id: string;
  tipo: string | null;
  valor: string | null;
  fuente: string | null;
  fecha_dato: string | null;
  estado: string | null;
  corroboraciones_count: number | null;
  parroquia_id: string | null;
  creado_por: string | null;
};

function cuando(fecha: string | null) {
  if (!fecha) return null;
  // fecha_dato es un date: se fuerza mediodía para que la zona no lo corra un día.
  const f = new Date(`${fecha}T12:00:00`);
  return Number.isNaN(f.getTime()) ? null : fechaCorta.format(f);
}

export default async function Estadisticas({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  const { error, aviso } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: datos }, { data: parroquias }, { data: municipios }] = await Promise.all([
    supabase
      .from("estadisticas")
      .select(
        "id, tipo, valor, fuente, fecha_dato, estado, corroboraciones_count, parroquia_id, creado_por"
      )
      .order("creado_en", { ascending: false })
      .limit(100),
    supabase
      .from("parroquias")
      .select("id, nombre, es_capital")
      .order("es_capital", { ascending: false })
      .order("nombre", { ascending: true }),
    supabase.from("municipios").select("id, nombre").order("nombre"),
  ]);

  const lista = (datos ?? []) as Estadistica[];
  const nombreParroquia = new Map(
    (parroquias ?? []).map((p) => [p.id as string, p.nombre as string])
  );

  // Lo que este usuario ya dijo, para no ofrecerle pronunciarse dos veces.
  const mias = new Map<string, string>();

  if (user && lista.length > 0) {
    const { data: propias } = await supabase
      .from("corroboraciones")
      .select("estadistica_id, tipo")
      .eq("usuario_id", user.id)
      .in(
        "estadistica_id",
        lista.map((d) => d.id)
      );

    for (const c of propias ?? []) {
      mias.set(c.estadistica_id as string, c.tipo as string);
    }
  }

  return (
    <main className="flex-1 bg-arena-50">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <Link
          href="/"
          className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
        >
          ← Morrogallo
        </Link>

        <h1 className="font-display text-4xl mt-6">Estadísticas</h1>
        <p className="text-sm text-tinta-600 mt-3 leading-relaxed max-w-2xl">
          Cada cifra de aquí la aportó alguien y dice de dónde la sacó. Ninguna
          se edita: si tienes un número mejor, lo agregas y queda el anterior
          para comparar. Las que los vecinos corroboran quedan marcadas como
          verificadas.
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

        {/* ---------------- Listado ---------------- */}
        <section className="mt-10 flex flex-col gap-4">
          {lista.length === 0 ? (
            <p className={`${seccion} text-sm text-tinta-600`}>
              Todavía no hay ningún dato. El primero puede ser tuyo.
            </p>
          ) : (
            lista.map((d) => (
              <article key={d.id} className={seccion}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-600">
                      {d.tipo ?? "sin nombre"}
                    </h2>
                    <p className="cifra text-3xl mt-2">{d.valor ?? "—"}</p>
                  </div>
                  <Sello estado={d.estado} />
                </div>

                <p className="text-sm text-tinta-600 mt-4 leading-relaxed">
                  {d.fuente ?? "sin fuente"}
                </p>

                <p className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    {d.parroquia_id
                      ? (nombreParroquia.get(d.parroquia_id) ?? "parroquia")
                      : "todo el municipio"}
                  </span>
                  {cuando(d.fecha_dato) ? <span>dato de {cuando(d.fecha_dato)}</span> : null}
                  <span>
                    {d.corroboraciones_count ?? 0}{" "}
                    {d.corroboraciones_count === 1 ? "corroboración" : "corroboraciones"}
                  </span>
                </p>

                <Opinar
                  id={d.id}
                  hayUsuario={Boolean(user)}
                  esMio={Boolean(user && d.creado_por === user.id)}
                  yaDije={mias.get(d.id) ?? null}
                />
              </article>
            ))
          )}
        </section>

        {/* ---------------- Aportar ---------------- */}
        {user ? (
          <form action={aportarEstadistica} className={`${seccion} mt-10`}>
            <h2 className="font-display text-2xl">Aportar un dato</h2>
            <p className="text-sm text-tinta-600 mt-2 leading-relaxed">
              Entra en revisión hasta que otros vecinos lo corroboren. La fuente
              es obligatoria: un documento, una gaceta, una placa, un informe.
            </p>

            <div className="flex flex-col gap-5 mt-6">
              <div>
                <label className={etiqueta} htmlFor="tipo">
                  Qué mide
                </label>
                <input
                  id="tipo"
                  name="tipo"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Población, escuelas públicas, kilómetros de costa…"
                  className={campo}
                />
              </div>

              <div>
                <label className={etiqueta} htmlFor="valor">
                  El dato
                </label>
                <input
                  id="valor"
                  name="valor"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="36.000 hab."
                  className={`${campo} cifra`}
                />
              </div>

              <div>
                <label className={etiqueta} htmlFor="ambito">
                  A qué corresponde
                </label>
                <select id="ambito" name="ambito" required className={campo}>
                  <option value="">Elige…</option>
                  {(municipios ?? []).map((m) => (
                    <option key={m.id} value={`municipio:${m.id}`}>
                      Todo el municipio {m.nombre}
                    </option>
                  ))}
                  {(parroquias ?? []).map((p) => (
                    <option key={p.id} value={`parroquia:${p.id}`}>
                      Parroquia {p.nombre}
                    </option>
                  ))}
                </select>
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
                  placeholder="Censo INE 2011 · Gaceta Municipal N.º 12 · Memoria y Cuenta 2025"
                  className={campo}
                />
              </div>

              <div>
                <label className={etiqueta} htmlFor="fecha">
                  Fecha del dato <span className="normal-case">(opcional)</span>
                </label>
                <input id="fecha" name="fecha" type="date" className={`${campo} cifra`} />
              </div>
            </div>

            <button className={`${boton} mt-6`} type="submit">
              Publicar aporte
            </button>
          </form>
        ) : (
          <p className={`${seccion} mt-10 text-sm text-tinta-600`}>
            Para aportar un dato hace falta tener cuenta.{" "}
            <Link href="/entrar" className="text-mar-700 underline">
              Entra o regístrate
            </Link>
            , es gratis y solo pide un correo.
          </p>
        )}
      </div>
    </main>
  );
}
