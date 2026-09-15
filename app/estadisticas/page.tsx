import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { aportarEstadistica, cambiarSello } from "./acciones";

export const metadata = {
  title: "Estadísticas",
  description:
    "Cifras del Municipio Fernando de Peñalver, cada una con su fuente, cargadas por el equipo del portal.",
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
 * El sello es control interno: solo lo ve un admin. Al vecino no le dice nada
 * útil que una cifra esté "en revisión" — para él la credencial es la fuente,
 * que sí está siempre a la vista.
 *
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
      className={`cifra text-[10px] uppercase tracking-[0.14em] border px-3 py-1 whitespace-nowrap ${sello.clase}`}
    >
      {sello.texto}
    </span>
  );
}

/**
 * Cambiar el sello. Solo lo ve un admin, y solo él puede usarlo: la política
 * de update en la base no deja a nadie más.
 */
function CambiarSello({ id, estado }: { id: string; estado: string | null }) {
  const verificado = estado === "verificado";

  return (
    <form action={cambiarSello} className="mt-5">
      <input type="hidden" name="estadistica" value={id} />
      <input type="hidden" name="estado" value={verificado ? "en_revision" : "verificado"} />
      <button
        type="submit"
        className={`cifra text-[11px] uppercase tracking-[0.14em] border px-4 py-2 transition-colors ${
          verificado
            ? "border-arena-200 text-tinta-600 hover:border-estrella-500/60 hover:text-estrella-600"
            : "border-monte-400/50 text-monte-600 hover:border-monte-600"
        }`}
      >
        {verificado ? "Devolver a revisión" : "Marcar verificada"}
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
  parroquia_id: string | null;
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
      .select("id, tipo, valor, fuente, fecha_dato, estado, parroquia_id")
      .order("creado_en", { ascending: false })
      .limit(100),
    supabase
      .from("parroquias")
      .select("id, nombre, es_capital")
      .order("es_capital", { ascending: false })
      .order("nombre", { ascending: true }),
    supabase.from("municipios").select("id, nombre").order("nombre"),
  ]);

  const { data: miPerfil } = user
    ? await supabase.from("perfiles").select("es_admin").eq("id", user.id).maybeSingle()
    : { data: null };

  const esAdmin = Boolean(miPerfil?.es_admin);

  const lista = (datos ?? []) as Estadistica[];
  const nombreParroquia = new Map(
    (parroquias ?? []).map((p) => [p.id as string, p.nombre as string])
  );

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
          Las cifras del municipio las carga el equipo del portal, y cada una
          dice de dónde salió. Ninguna se edita: si aparece un número mejor, se
          agrega y queda el anterior para comparar. Las que están respaldadas
          por un documento se marcan como verificadas; las demás quedan en
          revisión hasta tener el papel en la mano.
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
              Todavía no hay ninguna cifra cargada.
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
                  {esAdmin ? <Sello estado={d.estado} /> : null}
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
                </p>

                {esAdmin ? <CambiarSello id={d.id} estado={d.estado} /> : null}
              </article>
            ))
          )}
        </section>

        {/* ---------------- Cargar un dato ---------------- */}
        {esAdmin ? (
          <form action={aportarEstadistica} className={`${seccion} mt-10`}>
            <h2 className="font-display text-2xl">Cargar un dato</h2>
            <p className="text-sm text-tinta-600 mt-2 leading-relaxed">
              La fuente es obligatoria: un documento, una gaceta, una placa, un
              informe. Si la fuente es indirecta —una enciclopedia citando al
              INE, por ejemplo— déjalo en revisión.
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

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={etiqueta} htmlFor="estado">
                    Sello
                  </label>
                  <select id="estado" name="estado" required className={campo} defaultValue="en_revision">
                    <option value="en_revision">En revisión — fuente indirecta</option>
                    <option value="verificado">Verificado — tengo el documento</option>
                  </select>
                </div>

                <div>
                  <label className={etiqueta} htmlFor="fecha">
                    Fecha del dato <span className="normal-case">(opcional)</span>
                  </label>
                  <input id="fecha" name="fecha" type="date" className={`${campo} cifra`} />
                </div>
              </div>
            </div>

            <button className={`${boton} mt-6`} type="submit">
              Publicar dato
            </button>
          </form>
        ) : (
          <div className={`${seccion} mt-10`}>
            <h2 className="font-display text-2xl">¿Y si quiero aportar yo?</h2>
            <p className="text-sm text-tinta-600 mt-2 leading-relaxed">
              Estas cifras las carga el equipo del portal, con el documento
              delante, para que nadie pueda dañarlas. Lo del día a día del
              pueblo sí es tuyo:{" "}
              <Link href="/" className="text-mar-700 underline">
                publica en el feed
              </Link>{" "}
              una noticia, una reseña o una foto, y respalda las de los demás.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
