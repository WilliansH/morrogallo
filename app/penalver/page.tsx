import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import Footer from "../footer";
import Nav from "../nav";
import Ticker from "../ticker";

export const revalidate = 300;

type Parroquia = {
  id: string;
  nombre: string;
  es_capital: boolean | null;
};

/* ------------------------------------------------------------------ */
/* Ilustración del hero: sol, tres olas, cerro y tres estrellas.        */
/* SVG inline — se ve sin JavaScript y no pesa un request extra.        */
/* ------------------------------------------------------------------ */
function Ilustracion() {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Sol sobre el mar, el cerro del morrocoy y tres estrellas"
      className="w-full h-auto"
    >
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a5580" />
          <stop offset="100%" stopColor="#0e3556" />
        </linearGradient>
      </defs>

      <rect width="480" height="360" fill="url(#cielo)" />

      {/* Sol */}
      <circle cx="330" cy="112" r="46" fill="#E7D2A1" />
      <circle cx="330" cy="112" r="70" fill="#E7D2A1" opacity="0.14" />

      {/* Tres estrellas */}
      <g fill="#FBF4E4">
        <path d="M104 62l4.2 8.9 9.8 1.3-7.2 6.8 1.8 9.7-8.6-4.7-8.6 4.7 1.8-9.7-7.2-6.8 9.8-1.3z" />
        <path d="M150 44l3.4 7.1 7.8 1-5.7 5.4 1.4 7.7-6.9-3.7-6.9 3.7 1.4-7.7-5.7-5.4 7.8-1z" />
        <path d="M62 100l3.4 7.1 7.8 1-5.7 5.4 1.4 7.7-6.9-3.7-6.9 3.7 1.4-7.7-5.7-5.4 7.8-1z" />
      </g>

      {/* Cerro rojo — el morro */}
      <path d="M0 250 L96 150 L170 214 L232 176 L316 250 Z" fill="#A02E22" />
      <path d="M96 150 L134 190 L58 190 Z" fill="#C23B2E" />

      {/* Tres olas */}
      <path
        d="M0 250h480v110H0z"
        fill="#2F7FAE"
        opacity="0.35"
      />
      <path
        d="M0 262c60 0 60 18 120 18s60-18 120-18 60 18 120 18 60-18 120-18v98H0z"
        fill="#2F7FAE"
        opacity="0.55"
      />
      <path
        d="M0 292c60 0 60 18 120 18s60-18 120-18 60 18 120 18 60-18 120-18v68H0z"
        fill="#1A5580"
      />
      <path
        d="M0 322c60 0 60 18 120 18s60-18 120-18 60 18 120 18 60-18 120-18v38H0z"
        fill="#0E3556"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ficha de estadística. Tres estados posibles, ninguno inventado.      */
/* ------------------------------------------------------------------ */
type EstadoDato = "sin-datos" | "revision" | "verificado";

/**
 * Indicadores que la portada siempre muestra, aunque nadie los haya aportado
 * todavía: una ficha vacía dice "aquí falta esto" mucho mejor que no estar.
 */
const DESTACADOS = [
  "Población del municipio",
  "Superficie del municipio",
  "Densidad de población",
  "Parroquias",
  "Centros de votación",
  "Electores inscritos",
  "Escuelas públicas",
  "Ambulatorios y centros de salud",
];

/** El tipo es texto libre, así que se compara sin tildes ni mayúsculas. */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function comoEstado(estado: string | null): EstadoDato {
  if (estado === "verificado") return "verificado";
  if (estado === "en_revision") return "revision";
  return "sin-datos";
}

function Ficha({
  etiqueta,
  valor,
  unidad,
  estado,
  fuente,
}: {
  etiqueta: string;
  valor?: string;
  unidad?: string;
  estado: EstadoDato;
  fuente?: string;
}) {
  const sello = {
    "sin-datos": { texto: "Sin datos", clase: "text-tinta-400 border-arena-200" },
    revision: { texto: "En revisión", clase: "text-estrella-600 border-estrella-500/40" },
    verificado: { texto: "Verificado", clase: "text-monte-600 border-monte-400/50" },
  }[estado];

  return (
    <article className="reveal border border-arena-200 bg-white/60 p-7 flex flex-col gap-4">
      <span
        className={`cifra self-start text-[11px] uppercase tracking-[0.14em] border px-2 py-1 ${sello.clase}`}
      >
        {sello.texto}
      </span>

      <p className="cifra text-4xl text-tinta-900 leading-none">
        {valor ?? "—"}
        {unidad ? (
          <span className="text-base text-tinta-400 ml-2">{unidad}</span>
        ) : null}
      </p>

      <div>
        <h3 className="font-display text-lg text-tinta-900">{etiqueta}</h3>
        <p className="text-sm text-tinta-600 mt-1">
          {fuente ?? "Nadie ha aportado este dato todavía."}
        </p>
      </div>
    </article>
  );
}

export const metadata = {
  title: "Peñalver",
  description:
    "Datos del Municipio Fernando de Peñalver: cifras con su fuente, parroquias y la vida del pueblo contada por su gente.",
};

export default async function Penalver({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { bienvenida } = await searchParams;
  const supabase = await createClient();

  // El correo es el respaldo: alguien recién registrado puede no tener nombre.

  const { data: parroquias, error } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital")
    .order("es_capital", { ascending: false })
    .order("nombre", { ascending: true });

  const lista = (parroquias ?? []) as Parroquia[];

  // Los datos reales que haya aportado la gente. Lo verificado manda sobre lo
  // que está en revisión; entre iguales, el aporte más reciente.
  const { data: aportes } = await supabase
    .from("estadisticas")
    .select("tipo, valor, fuente, estado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(200);

  const porTipo = new Map<
    string,
    { valor: string | null; fuente: string | null; estado: string | null }
  >();

  for (const a of aportes ?? []) {
    const clave = normalizar(String(a.tipo ?? ""));
    const actual = porTipo.get(clave);

    if (!actual || (actual.estado !== "verificado" && a.estado === "verificado")) {
      porTipo.set(clave, { valor: a.valor, fuente: a.fuente, estado: a.estado });
    }
  }

  return (
    <>
      <Ticker />
      <Nav />


      <main className="flex-1">
        {bienvenida ? (
          <p
            role="status"
            className="mx-auto max-w-6xl px-6 pt-6 cifra text-sm text-monte-600"
          >
            Cuenta confirmada. Bienvenido a Morrogallo.
          </p>
        ) : null}

        {/* ---------------- Hero ---------------- */}
        <section className="bg-mar-900 text-arena-50">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid md:grid-cols-2 gap-14 items-center">
            <div className="reveal">
              <p className="cifra text-xs uppercase tracking-[0.2em] text-mar-200">
                Estado Anzoátegui
              </p>

              <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mt-5">
                Los datos de tu municipio,
                <br />
                con el papel que los respalda.
              </h1>

              <p className="text-lg text-mar-200 mt-6 max-w-lg leading-relaxed">
                Cada cifra lleva su fuente. Ningún número se edita a escondidas:
                si hay uno mejor, se agrega y el anterior queda para comparar.
                Las que tienen el documento delante van marcadas como
                verificadas; las demás, en revisión.
              </p>

              <div className="flex flex-wrap gap-4 mt-9">
                <a
                  href="#penalver"
                  className="cifra text-xs uppercase tracking-[0.14em] bg-arena-50 text-mar-900 px-6 py-3 hover:bg-arena-100 transition-colors"
                >
                  Ver Peñalver
                </a>
                <Link
                  href="/"
                  className="cifra text-xs uppercase tracking-[0.14em] border border-mar-500 text-mar-200 px-6 py-3 hover:border-arena-50 hover:text-arena-50 transition-colors"
                >
                  Ver la comunidad
                </Link>
              </div>
            </div>

            <div className="reveal">
              <Ilustracion />
              <p className="text-xs text-mar-200/70 mt-4 text-center">
                El morrocoy volador de la leyenda anzoatiguense, en el escudo del
                municipio.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Estadísticas ---------------- */}
        <section id="estadisticas" className="bg-arena-50">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="reveal max-w-2xl">
              <p className="cifra text-xs uppercase tracking-[0.2em] text-tinta-400">
                Estadísticas colaborativas
              </p>
              <h2 className="font-display text-4xl mt-4 leading-tight">
                Nada se presenta como oficial sin una fuente detrás.
              </h2>
              <p className="text-tinta-600 mt-5 leading-relaxed">
                Cada ficha se llena con aportes de los vecinos, y cada aporte
                dice de dónde salió. Las que todavía están vacías lo están a
                propósito: preferimos un hueco a un número inventado. El sello
                de verificado llega cuando tres personas distintas lo confirman.
              </p>

              <Link
                href="/estadisticas"
                className="cifra inline-block mt-7 text-xs uppercase tracking-[0.14em] border border-arena-200 text-tinta-600 hover:text-tinta-900 hover:border-tinta-400 px-6 py-3 transition-colors"
              >
                Ver todas y aportar
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {DESTACADOS.map((etiqueta) => {
                const dato = porTipo.get(normalizar(etiqueta));

                return (
                  <Ficha
                    key={etiqueta}
                    etiqueta={etiqueta}
                    valor={dato?.valor ?? undefined}
                    estado={comoEstado(dato?.estado ?? null)}
                    fuente={dato?.fuente ?? undefined}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- Peñalver ---------------- */}
        <section id="penalver" className="bg-monte-800 text-arena-50">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="reveal max-w-2xl">
              <p className="cifra text-xs uppercase tracking-[0.2em] text-monte-400">
                Municipio Fernando de Peñalver
              </p>
              <h2 className="font-display text-4xl mt-4 leading-tight">
                Puerto Píritu y sus parroquias.
              </h2>
              <p className="text-arena-100/80 mt-5 leading-relaxed">
                Morrogallo arranca aquí, pero está hecho para cualquiera de los
                21 municipios de Anzoátegui.
              </p>
            </div>

            {error ? (
              <p className="reveal cifra text-sm text-arena-200 border border-monte-600 p-6 mt-12">
                No se pudieron cargar las parroquias en este momento.
              </p>
            ) : (
              <ul className="grid sm:grid-cols-3 gap-6 mt-12">
                {lista.map((p) => (
                  <li
                    key={p.id}
                    className="reveal border border-monte-600 p-7 hover:border-monte-400 transition-colors"
                  >
                    {p.es_capital ? (
                      <span className="cifra text-[11px] uppercase tracking-[0.14em] text-monte-400">
                        Capital
                      </span>
                    ) : (
                      <span className="cifra text-[11px] uppercase tracking-[0.14em] text-arena-100/40">
                        Parroquia
                      </span>
                    )}
                    <h3 className="font-display text-2xl mt-3">{p.nombre}</h3>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
