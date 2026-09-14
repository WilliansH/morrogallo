import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { cerrarSesion } from "./entrar/acciones";

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { bienvenida } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: parroquias, error } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital")
    .order("es_capital", { ascending: false })
    .order("nombre", { ascending: true });

  const lista = (parroquias ?? []) as Parroquia[];

  return (
    <>
      {/* ---------------- Ticker ---------------- */}
      <div className="bg-tinta-900 text-arena-100">
        <div className="mx-auto max-w-6xl px-6 py-2 flex flex-wrap items-center gap-x-8 gap-y-1 cifra text-[11px] uppercase tracking-[0.14em]">
          {/* TODO: alimentar desde valores_referencia (BCV por API route, UCD por panel de admin). */}
          <span>
            BCV <span className="text-tinta-400">pendiente</span>
          </span>
          <span>
            UCD <span className="text-tinta-400">pendiente</span>
          </span>
          <span className="ml-auto text-tinta-400 normal-case tracking-normal">
            Anzoátegui, Venezuela
          </span>
        </div>
      </div>

      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-50 bg-arena-50/90 backdrop-blur border-b border-arena-200">
        <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-tight text-tinta-900">
            Morrogallo
          </Link>

          <ul className="hidden md:flex items-center gap-8 text-sm text-tinta-600">
            <li>
              <a className="hover:text-tinta-900 transition-colors" href="#estadisticas">
                Estadísticas
              </a>
            </li>
            <li>
              <a className="hover:text-tinta-900 transition-colors" href="#penalver">
                Peñalver
              </a>
            </li>
            <li>
              <a className="hover:text-tinta-900 transition-colors" href="#comunidad">
                Comunidad
              </a>
            </li>
          </ul>

          {user ? (
            <div className="flex items-center gap-4">
              <span
                className="cifra hidden sm:inline text-[11px] text-tinta-600 max-w-[16ch] truncate"
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="cifra text-xs uppercase tracking-[0.14em] border border-arena-200 text-tinta-600 hover:text-tinta-900 hover:border-tinta-400 px-4 py-2 transition-colors"
                >
                  Salir
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/entrar"
              className="cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-4 py-2 transition-colors"
            >
              Entrar
            </Link>
          )}
        </nav>
      </header>

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
                verificados por quienes viven en él.
              </h1>

              <p className="text-lg text-mar-200 mt-6 max-w-lg leading-relaxed">
                Cada cifra lleva su fuente. Ningún número se edita a escondidas:
                si hay uno mejor, se aporta y los vecinos lo corroboran. Tres
                voces lo verifican, una sola basta para ponerlo en duda.
              </p>

              <div className="flex flex-wrap gap-4 mt-9">
                <a
                  href="#penalver"
                  className="cifra text-xs uppercase tracking-[0.14em] bg-arena-50 text-mar-900 px-6 py-3 hover:bg-arena-100 transition-colors"
                >
                  Ver Peñalver
                </a>
                <a
                  href="#comunidad"
                  className="cifra text-xs uppercase tracking-[0.14em] border border-mar-500 text-mar-200 px-6 py-3 hover:border-arena-50 hover:text-arena-50 transition-colors"
                >
                  Cómo participar
                </a>
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
                Estas fichas están vacías a propósito. Se llenan con aportes de
                los vecinos, cada uno con su fuente, y solo llevan el sello de
                verificado cuando tres personas distintas lo confirman.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              <Ficha
                etiqueta="Superficie del municipio"
                valor="643"
                unidad="km²"
                estado="revision"
                fuente="Estimación sin fuente confirmada. Pendiente de corroboración."
              />
              <Ficha
                etiqueta="Población de Peñalver"
                valor="~36.000"
                unidad="hab."
                estado="revision"
                fuente="Estimación sin fuente confirmada. Pendiente de corroboración."
              />
              <Ficha etiqueta="Centros de votación" estado="sin-datos" />
              <Ficha etiqueta="Electores inscritos" estado="sin-datos" />
              <Ficha etiqueta="Escuelas públicas" estado="sin-datos" />
              <Ficha etiqueta="Ambulatorios y centros de salud" estado="sin-datos" />
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

        {/* ---------------- Comunidad ---------------- */}
        <section id="comunidad" className="bg-arena-100">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="reveal max-w-2xl">
              <p className="cifra text-xs uppercase tracking-[0.2em] text-tinta-400">
                Red comunitaria
              </p>
              <h2 className="font-display text-4xl mt-4 leading-tight">
                Lo que pasa en la parroquia lo cuenta la parroquia.
              </h2>
            </div>

            <ol className="grid md:grid-cols-3 gap-10 mt-12">
              {[
                {
                  n: "01",
                  t: "Te registras con tu correo",
                  d: "Eliges tu municipio y tu parroquia. Nada más hace falta.",
                },
                {
                  n: "02",
                  t: "Subes fotos y noticias",
                  d: "Lo que ves en la calle, el puerto, la plaza o la escuela.",
                },
                {
                  n: "03",
                  t: "Los vecinos lo validan",
                  d: "Un voto por persona. Lo que la comunidad respalda, sube.",
                },
              ].map((paso) => (
                <li key={paso.n} className="reveal">
                  <span className="cifra text-xs text-estrella-500 tracking-[0.2em]">
                    {paso.n}
                  </span>
                  <h3 className="font-display text-2xl mt-3">{paso.t}</h3>
                  <p className="text-tinta-600 mt-2 leading-relaxed">{paso.d}</p>
                </li>
              ))}
            </ol>

            {user ? null : (
              <div className="reveal mt-14">
                <Link
                  href="/entrar?modo=registro"
                  className="cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 inline-block transition-colors"
                >
                  Crear mi cuenta
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-tinta-900 text-arena-100">
        <div className="mx-auto max-w-6xl px-6 py-14 grid sm:grid-cols-3 gap-10">
          <div>
            <p className="font-display text-xl">Morrogallo</p>
            <p className="text-sm text-tinta-400 mt-2 leading-relaxed">
              Portal comunitario del estado Anzoátegui.
            </p>
          </div>

          <div>
            <p className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
              Secciones
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a className="hover:text-arena-50 transition-colors" href="#estadisticas">
                  Estadísticas
                </a>
              </li>
              <li>
                <a className="hover:text-arena-50 transition-colors" href="#penalver">
                  Peñalver
                </a>
              </li>
              <li>
                <a className="hover:text-arena-50 transition-colors" href="#comunidad">
                  Comunidad
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
              Redes
            </p>
            <p className="text-sm text-tinta-400 mt-3">
              Enlaces de la Alcaldía y la comunidad, pendientes.
            </p>
          </div>
        </div>

        <div className="border-t border-tinta-600/40">
          <p className="mx-auto max-w-6xl px-6 py-5 cifra text-[11px] text-tinta-400">
            Hecho en Puerto Píritu. Los colores son una aproximación a la bandera
            del municipio, pendiente de confirmación con la Alcaldía.
          </p>
        </div>
      </footer>
    </>
  );
}
