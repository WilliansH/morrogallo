import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { ocultar, publicar, votar } from "./acciones-feed";
import ComprimirImagen from "./comprimir-imagen";
import Footer from "./footer";
import Morrogallo from "./morrogallo";
import Nav from "./nav";
import Ticker from "./ticker";

export const metadata = {
  title: "Morrogallo — lo que pasa en el municipio",
  description:
    "Noticias, reseñas y fotos de la gente del Municipio Fernando de Peñalver, parroquia por parroquia.",
};

const POR_PAGINA = 20;

const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const boton =
  "cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";
const tarjeta = "border border-arena-200 bg-white/60 p-6";

const NOMBRE_TIPO: Record<string, string> = {
  noticia: "Noticia",
  resena: "Reseña",
  foto: "Foto",
};

const cuando = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});

type Publicacion = {
  id: string;
  usuario_id: string | null;
  parroquia_id: string | null;
  tipo: string | null;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  imagen_mini_url: string | null;
  votos_count: number | null;
  creado_en: string | null;
};

function fecha(iso: string | null) {
  if (!iso) return null;
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? null : cuando.format(f);
}

export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    aviso?: string;
    orden?: string;
    parroquia?: string;
    pagina?: string;
    bienvenida?: string;
  }>;
}) {
  const { error, aviso, orden, parroquia, pagina, bienvenida } = await searchParams;

  const porVotos = orden === "votados";
  const nPagina = Math.max(1, Number(pagina) || 1);
  const desde = (nPagina - 1) * POR_PAGINA;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: parroquias } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital")
    .order("es_capital", { ascending: false })
    .order("nombre", { ascending: true });

  let consulta = supabase
    .from("publicaciones")
    .select(
      "id, usuario_id, parroquia_id, tipo, titulo, descripcion, imagen_url, imagen_mini_url, votos_count, creado_en"
    )
    // oculto puede venir en null en filas viejas: null tampoco es "oculto".
    .not("oculto", "is", true)
    .range(desde, desde + POR_PAGINA);

  if (parroquia) consulta = consulta.eq("parroquia_id", parroquia);

  consulta = porVotos
    ? consulta.order("votos_count", { ascending: false }).order("creado_en", { ascending: false })
    : consulta.order("creado_en", { ascending: false });

  const { data: filas } = await consulta;

  const todas = (filas ?? []) as Publicacion[];
  const hayMas = todas.length > POR_PAGINA;
  const lista = todas.slice(0, POR_PAGINA);

  const nombreParroquia = new Map(
    (parroquias ?? []).map((p) => [p.id as string, p.nombre as string])
  );

  // Nombres de quienes publicaron. La vista perfiles_publicos solo expone lo
  // que es público; si todavía no existe, el feed se muestra igual sin nombres.
  const autores = new Map<string, { nombre: string | null; foto: string | null }>();
  const idsAutores = [...new Set(lista.map((p) => p.usuario_id).filter(Boolean))] as string[];

  if (idsAutores.length > 0) {
    const { data: perfiles } = await supabase
      .from("perfiles_publicos")
      .select("id, nombre_visible, foto_url, foto_mini_url")
      .in("id", idsAutores);

    for (const p of perfiles ?? []) {
      autores.set(p.id as string, {
        nombre: (p.nombre_visible as string) ?? null,
        foto: ((p.foto_mini_url ?? p.foto_url) as string) ?? null,
      });
    }
  }

  // Qué votó ya esta persona.
  const misVotos = new Set<string>();

  if (user && lista.length > 0) {
    const { data: votos } = await supabase
      .from("votos")
      .select("publicacion_id")
      .eq("usuario_id", user.id)
      .in(
        "publicacion_id",
        lista.map((p) => p.id)
      );

    for (const v of votos ?? []) misVotos.add(v.publicacion_id as string);
  }

  const { data: miPerfil } = user
    ? await supabase
        .from("perfiles")
        .select("es_admin, nombre_visible, foto_url, foto_mini_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const esAdmin = Boolean(miPerfil?.es_admin);
  const miNombre = (miPerfil?.nombre_visible as string | null)?.trim().split(" ")[0] ?? "";

  function enlace(cambios: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const base = { orden, parroquia, ...cambios };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/?${q}` : "/";
  }

  return (
    <>
      <Ticker />
      <Nav />

      <main className="flex-1 bg-arena-50">
        {/* Quien llega sin cuenta necesita entender dónde cayó. */}
        {user ? null : (
          <section className="bg-mar-900 text-arena-50">
            <div className="mx-auto max-w-3xl px-6 py-12 grid gap-10 md:grid-cols-[1fr_14rem] md:items-center">
              <div>
                <p className="cifra text-xs uppercase tracking-[0.2em] text-mar-200">
                  Municipio Fernando de Peñalver
                </p>
                <h1 className="font-display text-4xl md:text-5xl leading-tight mt-4">
                  Lo que pasa en el pueblo, contado por el pueblo.
                </h1>
                <p className="text-mar-200 mt-4 leading-relaxed">
                  Noticias del barrio, reseñas de dónde comer, fotos de la calle y
                  del puerto. Te registras con tu correo, eliges tu parroquia y
                  publicas. Lo que los vecinos respaldan, sube.
                </p>
                <div className="flex flex-wrap gap-4 mt-7">
                  <Link
                    href="/entrar?modo=registro"
                    className="cifra text-xs uppercase tracking-[0.14em] bg-arena-50 text-mar-900 px-6 py-3 hover:bg-arena-100 transition-colors"
                  >
                    Crear mi cuenta
                  </Link>
                  <Link
                    href="/penalver"
                    className="cifra text-xs uppercase tracking-[0.14em] border border-mar-500 text-mar-200 px-6 py-3 hover:border-arena-50 hover:text-arena-50 transition-colors"
                  >
                    Datos del municipio
                  </Link>
                </div>
              </div>

              {/* La mascota: el morrocoy volador que ya está en el escudo. */}
              <Morrogallo
                piel="contra"
                alt="El Morrogallo: morrocoy con cabeza y cola de gallo"
                className="w-48 md:w-full justify-self-center"
              />
            </div>
          </section>
        )}

        <div className="mx-auto max-w-3xl px-6 py-10">
          {bienvenida ? (
            <p role="status" className="cifra text-sm text-monte-600 mb-6">
              Cuenta confirmada. Bienvenido a Morrogallo.
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mb-6 border border-estrella-500/40 bg-white px-4 py-3 text-sm text-estrella-600"
            >
              {error}
            </p>
          ) : null}

          {aviso ? (
            <p
              role="status"
              className="mb-6 border border-monte-400/50 bg-white px-4 py-3 text-sm text-monte-600"
            >
              {aviso}
            </p>
          ) : null}

          {/* ---------------- Publicar ---------------- */}
          {user ? (
            /*
             * Plegado por defecto para no comerse la pantalla: el feed es lo
             * que la gente viene a ver. <details> lo abre y lo cierra sin una
             * línea de JavaScript, y si el envío falló se queda abierto para
             * que nadie pierda lo que escribió.
             */
            <details open={Boolean(error)} className="border border-arena-200 bg-white/60 mb-8">
              <summary className="flex items-center gap-3 p-4">
                {miPerfil?.foto_mini_url || miPerfil?.foto_url ? (
                  <Image
                    src={(miPerfil.foto_mini_url ?? miPerfil.foto_url) as string}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="w-9 h-9 object-cover border border-arena-200 shrink-0"
                  />
                ) : (
                  <span className="w-9 h-9 border border-arena-200 bg-arena-100 shrink-0" />
                )}

                <span className="flex-1 border border-arena-200 bg-arena-50 px-4 py-2.5 text-sm text-tinta-400">
                  {miNombre
                    ? `¿Qué está pasando, ${miNombre}?`
                    : "¿Qué está pasando en el pueblo?"}
                </span>
              </summary>

              <form action={publicar} className="px-4 pb-5">
              <div className="flex flex-col gap-5 mt-1">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={etiqueta} htmlFor="tipo">
                      Qué es
                    </label>
                    <select id="tipo" name="tipo" required className={campo}>
                      <option value="noticia">Noticia</option>
                      <option value="resena">Reseña</option>
                      <option value="foto">Foto</option>
                    </select>
                  </div>

                  <div>
                    <label className={etiqueta} htmlFor="parroquia">
                      Parroquia
                    </label>
                    <select id="parroquia" name="parroquia" required className={campo}>
                      {(parroquias ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={etiqueta} htmlFor="titulo">
                    Título
                  </label>
                  <input
                    id="titulo"
                    name="titulo"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Arreglaron el alumbrado de la plaza · Almuerzo en el malecón"
                    className={campo}
                  />
                </div>

                <div>
                  <label className={etiqueta} htmlFor="descripcion">
                    Cuéntalo <span className="normal-case">(opcional)</span>
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    rows={3}
                    className={campo}
                    placeholder="Lo que viste, cómo estuvo, qué recomiendas."
                  />
                </div>

                <div>
                  <label className={etiqueta} htmlFor="foto">
                    Foto <span className="normal-case">(opcional)</span>
                  </label>
                  <ComprimirImagen className="block w-full text-sm text-tinta-600 file:cifra file:mr-4 file:border file:border-arena-200 file:bg-arena-100 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-tinta-600" />
                </div>
              </div>

              <button className={`${boton} mt-6`} type="submit">
                Publicar
              </button>
              </form>
            </details>
          ) : null}

          {/* ---------------- Filtros ---------------- */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 mb-6">
            <Link
              href={enlace({ orden: undefined, pagina: undefined })}
              className={porVotos ? "hover:text-tinta-900" : "text-tinta-900"}
            >
              Recientes
            </Link>
            <Link
              href={enlace({ orden: "votados", pagina: undefined })}
              className={porVotos ? "text-tinta-900" : "hover:text-tinta-900"}
            >
              Más respaldadas
            </Link>

            <span className="ml-auto flex flex-wrap gap-x-4 gap-y-2">
              <Link
                href={enlace({ parroquia: undefined, pagina: undefined })}
                className={parroquia ? "hover:text-tinta-900" : "text-tinta-900"}
              >
                Todas
              </Link>
              {(parroquias ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={enlace({ parroquia: p.id as string, pagina: undefined })}
                  className={parroquia === p.id ? "text-tinta-900" : "hover:text-tinta-900"}
                >
                  {p.nombre}
                </Link>
              ))}
            </span>
          </div>

          {/* ---------------- Feed ---------------- */}
          <section className="flex flex-col gap-4">
            {lista.length === 0 ? (
              <p className={`${tarjeta} text-sm text-tinta-600`}>
                Todavía no hay nada publicado por aquí. Si viste algo hoy en el
                pueblo, cuéntalo tú.
              </p>
            ) : (
              lista.map((p) => {
                const autor = p.usuario_id ? autores.get(p.usuario_id) : null;
                const yaVote = misVotos.has(p.id);

                return (
                  <article key={p.id} className={tarjeta}>
                    <header className="flex items-center gap-3">
                      {autor?.foto ? (
                        <Image
                          src={autor.foto}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="w-8 h-8 object-cover border border-arena-200"
                        />
                      ) : (
                        <span className="w-8 h-8 border border-arena-200 bg-arena-100" />
                      )}

                      <div className="min-w-0">
                        <p className="text-sm text-tinta-900 truncate">
                          {autor?.nombre?.trim() || "Un vecino"}
                        </p>
                        <p className="cifra text-[10px] uppercase tracking-[0.14em] text-tinta-400">
                          {NOMBRE_TIPO[p.tipo ?? ""] ?? p.tipo}
                          {p.parroquia_id && nombreParroquia.get(p.parroquia_id)
                            ? ` · ${nombreParroquia.get(p.parroquia_id)}`
                            : ""}
                          {fecha(p.creado_en) ? ` · ${fecha(p.creado_en)}` : ""}
                        </p>
                      </div>
                    </header>

                    <h2 className="font-display text-xl mt-4">{p.titulo}</h2>

                    {p.descripcion ? (
                      <p className="text-sm text-tinta-600 mt-2 leading-relaxed whitespace-pre-line">
                        {p.descripcion}
                      </p>
                    ) : null}

                    {p.imagen_mini_url || p.imagen_url ? (
                      <a
                        href={p.imagen_url ?? p.imagen_mini_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4"
                      >
                        {/* El feed carga la miniatura; la grande solo si la abren. */}
                        {/*
                          * Tope de altura: una foto vertical de celular medía
                          * 1.200px de alto en pantalla y se comía el feed
                          * entero. object-contain para no recortarle nada a
                          * nadie: se ve completa, dentro del tope.
                          */}
                        <Image
                          src={(p.imagen_mini_url ?? p.imagen_url) as string}
                          alt={p.titulo ?? ""}
                          width={400}
                          height={400}
                          unoptimized
                          className="w-full h-auto max-h-[28rem] object-contain bg-arena-100 border border-arena-200"
                        />
                      </a>
                    ) : null}

                    <div className="flex items-center gap-4 mt-5">
                      {user ? (
                        <form action={votar}>
                          <input type="hidden" name="publicacion" value={p.id} />
                          {yaVote ? <input type="hidden" name="quitar" value="1" /> : null}
                          <button
                            type="submit"
                            className={`cifra text-[11px] uppercase tracking-[0.14em] border px-4 py-2 transition-colors ${
                              yaVote
                                ? "border-monte-400/50 text-monte-600"
                                : "border-arena-200 text-tinta-600 hover:border-tinta-400 hover:text-tinta-900"
                            }`}
                          >
                            {yaVote ? "Respaldada" : "Respaldar"} · {p.votos_count ?? 0}
                          </button>
                        </form>
                      ) : (
                        <span className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
                          {p.votos_count ?? 0}{" "}
                          {p.votos_count === 1 ? "respaldo" : "respaldos"}
                        </span>
                      )}

                      {esAdmin ? (
                        <form action={ocultar}>
                          <input type="hidden" name="publicacion" value={p.id} />
                          <button
                            type="submit"
                            className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-estrella-600 underline transition-colors"
                          >
                            Ocultar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          {/* ---------------- Páginas ---------------- */}
          {nPagina > 1 || hayMas ? (
            <nav className="flex justify-between mt-8 cifra text-[11px] uppercase tracking-[0.14em]">
              {nPagina > 1 ? (
                <Link
                  href={enlace({ pagina: String(nPagina - 1) })}
                  className="text-tinta-600 hover:text-tinta-900"
                >
                  ← Más nuevas
                </Link>
              ) : (
                <span />
              )}

              {hayMas ? (
                <Link
                  href={enlace({ pagina: String(nPagina + 1) })}
                  className="text-tinta-600 hover:text-tinta-900"
                >
                  Más viejas →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </main>

      <Footer />
    </>
  );
}
