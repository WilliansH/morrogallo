import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { borrarPublicacion } from "../acciones";

import Footer from "../../footer";
import Nav from "../../nav";
import Ticker from "../../ticker";

const POR_PAGINA = 24;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOMBRE_TIPO: Record<string, string> = {
  noticia: "Noticia",
  resena: "Reseña",
  foto: "Foto",
};

const cuando = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});

function fecha(iso: string | null) {
  if (!iso) return null;
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? null : cuando.format(f);
}

type Publicacion = {
  id: string;
  parroquia_id: string | null;
  tipo: string | null;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  imagen_mini_url: string | null;
  votos_count: number | null;
  oculto: boolean | null;
  creado_en: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; aviso?: string; pagina?: string }>;
};

/** Datos públicos de un vecino: sale de perfiles_publicos, nunca de perfiles. */
async function vecino(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("perfiles_publicos")
    .select("id, nombre_visible, foto_url, foto_mini_url, parroquia_id")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const v = await vecino(id);
  const nombre = v?.nombre_visible?.trim() || "Un vecino";
  return { title: `${nombre} — Morrogallo` };
}

/**
 * Perfil público de un vecino: su foto, su nombre, su parroquia y lo que ha
 * publicado. Teléfono, dirección y correo nunca salen de aquí.
 *
 * Si quien mira es el dueño, cada publicación trae un botón para borrarla,
 * y ve también las que el admin ocultó (para poder borrarlas si quiere).
 */
export default async function Vecino({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, aviso, pagina } = await searchParams;

  const perfil = await vecino(id);
  if (!perfil) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esMio = user?.id === perfil.id;

  const nPagina = Math.max(1, Number(pagina) || 1);
  const desde = (nPagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from("publicaciones")
    .select(
      "id, parroquia_id, tipo, titulo, descripcion, imagen_url, imagen_mini_url, votos_count, oculto, creado_en"
    )
    .eq("usuario_id", perfil.id)
    .order("creado_en", { ascending: false })
    .range(desde, desde + POR_PAGINA);

  if (!esMio) consulta = consulta.not("oculto", "is", true);

  const [{ data: filas }, { data: parroquias }] = await Promise.all([
    consulta,
    supabase.from("parroquias").select("id, nombre"),
  ]);

  const todas = (filas ?? []) as Publicacion[];
  const hayMas = todas.length > POR_PAGINA;
  const lista = todas.slice(0, POR_PAGINA);

  const nombreParroquia = new Map(
    (parroquias ?? []).map((p) => [p.id as string, p.nombre as string])
  );

  const nombre = perfil.nombre_visible?.trim() || "Un vecino";
  const foto = (perfil.foto_url ?? perfil.foto_mini_url) as string | null;
  const suParroquia = perfil.parroquia_id ? nombreParroquia.get(perfil.parroquia_id) : null;

  return (
    <>
      <Ticker />
      <Nav />

      <main className="flex-1 bg-arena-50">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          <Link
            href="/"
            className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
          >
            ← Comunidad
          </Link>

          {/* ---------------- Cabecera ---------------- */}
          <header className="flex items-center gap-6 mt-8">
            {foto ? (
              <Image
                src={foto}
                alt={`Foto de ${nombre}`}
                width={160}
                height={160}
                unoptimized
                className="w-24 h-24 md:w-28 md:h-28 object-cover border border-arena-200 shrink-0"
              />
            ) : (
              <span className="w-24 h-24 md:w-28 md:h-28 border border-arena-200 bg-arena-100 shrink-0" />
            )}

            <div className="min-w-0">
              <h1 className="font-display text-3xl md:text-4xl leading-tight break-words">
                {nombre}
              </h1>
              <p className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 mt-2">
                {suParroquia ? `${suParroquia} · ` : ""}
                {lista.length === 0 && nPagina === 1
                  ? "Sin publicaciones"
                  : `${hayMas ? `${POR_PAGINA}+` : desde + lista.length} ${
                      desde + lista.length === 1 ? "publicación" : "publicaciones"
                    }`}
              </p>
            </div>

            {/* La tuerca: todos los ajustes de la cuenta viven detrás de ella. */}
            {esMio ? (
              <Link
                href="/perfil/ajustes"
                title="Ajustes"
                aria-label="Ajustes de mi cuenta"
                className="ml-auto self-start shrink-0 p-2 border border-arena-200 text-tinta-600 hover:text-tinta-900 hover:border-tinta-400 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
            ) : null}
          </header>

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

          {esMio ? (
            <p className="text-sm text-tinta-600 mt-8 leading-relaxed">
              Esto es lo que has subido, y así lo ven los demás. Lo que borres
              aquí se borra del sitio y de la base de datos, con su foto.
            </p>
          ) : null}

          {/* ---------------- Publicaciones ---------------- */}
          <section className="grid sm:grid-cols-2 gap-4 mt-8">
            {lista.length === 0 ? (
              <p className="sm:col-span-2 border border-arena-200 bg-white/60 p-6 text-sm text-tinta-600">
                {esMio
                  ? "Todavía no has publicado nada. Lo que publiques en la comunidad aparece aquí."
                  : `${nombre} todavía no ha publicado nada.`}
              </p>
            ) : (
              lista.map((p) => (
                <article
                  key={p.id}
                  className="border border-arena-200 bg-white/60 flex flex-col"
                >
                  {p.imagen_mini_url || p.imagen_url ? (
                    <a
                      href={p.imagen_url ?? p.imagen_mini_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={(p.imagen_mini_url ?? p.imagen_url) as string}
                        alt={p.titulo ?? ""}
                        width={320}
                        height={320}
                        unoptimized
                        className="w-full aspect-square object-cover bg-arena-100 border-b border-arena-200"
                      />
                    </a>
                  ) : null}

                  <div className="p-5 flex flex-col flex-1">
                    <p className="cifra text-[10px] uppercase tracking-[0.14em] text-tinta-400">
                      {NOMBRE_TIPO[p.tipo ?? ""] ?? p.tipo}
                      {p.parroquia_id && nombreParroquia.get(p.parroquia_id)
                        ? ` · ${nombreParroquia.get(p.parroquia_id)}`
                        : ""}
                      {fecha(p.creado_en) ? ` · ${fecha(p.creado_en)}` : ""}
                    </p>

                    <h2 className="font-display text-lg mt-2">{p.titulo}</h2>

                    {p.descripcion ? (
                      <p className="text-sm text-tinta-600 mt-2 leading-relaxed whitespace-pre-line line-clamp-4">
                        {p.descripcion}
                      </p>
                    ) : null}

                    {esMio && p.oculto ? (
                      <p className="cifra text-[10px] uppercase tracking-[0.14em] text-estrella-600 mt-3">
                        Oculta por moderación · solo tú la ves
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between gap-4 mt-auto pt-4">
                      <span className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400">
                        {p.votos_count ?? 0} {p.votos_count === 1 ? "respaldo" : "respaldos"}
                      </span>

                      {esMio ? (
                        /*
                         * Confirmación sin JavaScript: el primer clic abre el
                         * <details>, el segundo borra.
                         */
                        <details className="text-right">
                          <summary className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-estrella-600 underline cursor-pointer list-none">
                            Borrar
                          </summary>
                          <form action={borrarPublicacion} className="mt-2">
                            <input type="hidden" name="publicacion" value={p.id} />
                            <button
                              type="submit"
                              className="cifra text-[11px] uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-3 py-2 transition-colors"
                            >
                              Sí, borrar para siempre
                            </button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* ---------------- Páginas ---------------- */}
          {nPagina > 1 || hayMas ? (
            <nav className="flex justify-between mt-8 cifra text-[11px] uppercase tracking-[0.14em]">
              {nPagina > 1 ? (
                <Link
                  href={`/vecino/${perfil.id}${nPagina > 2 ? `?pagina=${nPagina - 1}` : ""}`}
                  className="text-tinta-600 hover:text-tinta-900"
                >
                  ← Más nuevas
                </Link>
              ) : (
                <span />
              )}
              {hayMas ? (
                <Link
                  href={`/vecino/${perfil.id}?pagina=${nPagina + 1}`}
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
