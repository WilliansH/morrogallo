import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ocultar, votar } from "../../acciones-feed";
import BotonPublicar from "../../boton-publicar";
import Footer from "../../footer";
import Nav from "../../nav";
import Ticker from "../../ticker";
import { borrarComentario, comentar, ocultarComentario } from "../acciones";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function fecha(iso: string | null) {
  if (!iso) return null;
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? null : cuando.format(f);
}

const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const boton =
  "cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";
const enlaceChico =
  "cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-estrella-600 underline transition-colors";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; aviso?: string }>;
};

async function leerPublicacion(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("publicaciones")
    .select(
      "id, usuario_id, parroquia_id, tipo, titulo, descripcion, imagen_url, imagen_mini_url, votos_count, comentarios_count, oculto, creado_en"
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * El preview de WhatsApp: título, un pedazo del texto y la foto. Por esto
 * cada publicación tiene su página: es lo que la gente se manda.
 */
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await leerPublicacion(id);
  if (!p || p.oculto) return { title: "Morrogallo" };

  const descripcion = (p.descripcion as string | null)?.slice(0, 160) ?? undefined;
  const imagen = (p.imagen_url ?? p.imagen_mini_url) as string | null;

  return {
    title: `${p.titulo} — Morrogallo`,
    description: descripcion,
    openGraph: {
      title: p.titulo as string,
      description: descripcion,
      type: "article",
      ...(imagen ? { images: [{ url: imagen }] } : {}),
    },
  };
}

/**
 * Una publicación con sus comentarios.
 *
 * Todo con formularios: se comenta, se borra y se oculta sin JavaScript.
 */
export default async function PaginaPublicacion({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, aviso } = await searchParams;

  const p = await leerPublicacion(id);
  if (!p) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = user
    ? await supabase.from("perfiles").select("es_admin").eq("id", user.id).maybeSingle()
    : { data: null };

  const esAdmin = Boolean(miPerfil?.es_admin);
  const esMia = user?.id === p.usuario_id;

  // Oculta por moderación: solo la ven su autor y el admin.
  if (p.oculto && !esMia && !esAdmin) notFound();

  const [{ data: comentarios }, { data: parroquia }, { data: yaVote }] = await Promise.all([
    supabase
      .from("comentarios")
      .select("id, usuario_id, texto, oculto, creado_en")
      .eq("publicacion_id", p.id)
      .order("creado_en", { ascending: true })
      .limit(300),
    p.parroquia_id
      ? supabase.from("parroquias").select("nombre").eq("id", p.parroquia_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("votos")
          .select("id")
          .eq("publicacion_id", p.id)
          .eq("usuario_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lista = comentarios ?? [];

  // Nombres y avatares: del autor y de quienes comentaron, en una sola consulta.
  const ids = [
    ...new Set([p.usuario_id, ...lista.map((c) => c.usuario_id)].filter(Boolean)),
  ] as string[];

  const { data: perfiles } = ids.length
    ? await supabase
        .from("perfiles_publicos")
        .select("id, nombre_visible, foto_url, foto_mini_url")
        .in("id", ids)
    : { data: [] };

  const gente = new Map(
    (perfiles ?? []).map((g) => [
      g.id as string,
      {
        nombre: (g.nombre_visible as string | null)?.trim() || "Un vecino",
        foto: (g.foto_mini_url ?? g.foto_url) as string | null,
      },
    ])
  );

  const autor = p.usuario_id ? gente.get(p.usuario_id) : null;
  const claveEnvio = crypto.randomUUID();

  return (
    <>
      <Ticker />
      <Nav />

      <main className="flex-1 bg-arena-50">
        <div className="mx-auto max-w-2xl px-6 py-10 md:py-14">
          <Link
            href="/"
            className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
          >
            ← Comunidad
          </Link>

          {/* ---------------- La publicación ---------------- */}
          <article className="border border-arena-200 bg-white/60 p-6 mt-6">
            <header className="flex items-center gap-3">
              <Link
                href={p.usuario_id ? `/vecino/${p.usuario_id}` : "#"}
                className="flex items-center gap-3 min-w-0 group"
              >
                {autor?.foto ? (
                  <Image
                    src={autor.foto}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 object-cover border border-arena-200"
                  />
                ) : (
                  <span className="w-10 h-10 border border-arena-200 bg-arena-100" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-tinta-900 truncate group-hover:underline">
                    {autor?.nombre ?? "Un vecino"}
                  </p>
                  <p className="cifra text-[10px] uppercase tracking-[0.14em] text-tinta-400">
                    {NOMBRE_TIPO[p.tipo ?? ""] ?? p.tipo}
                    {parroquia?.nombre ? ` · ${parroquia.nombre}` : ""}
                    {fecha(p.creado_en) ? ` · ${fecha(p.creado_en)}` : ""}
                  </p>
                </div>
              </Link>
            </header>

            {p.oculto ? (
              <p className="cifra text-[10px] uppercase tracking-[0.14em] text-estrella-600 mt-4">
                Oculta por moderación · solo la ven su autor y el admin
              </p>
            ) : null}

            <h1 className="font-display text-2xl md:text-3xl mt-4">{p.titulo}</h1>

            {p.descripcion ? (
              <p className="text-tinta-600 mt-3 leading-relaxed whitespace-pre-line">
                {p.descripcion}
              </p>
            ) : null}

            {p.imagen_mini_url || p.imagen_url ? (
              <a
                href={p.imagen_url ?? p.imagen_mini_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-5"
              >
                {/* La miniatura en la página; la grande solo si la abren. */}
                <Image
                  src={(p.imagen_mini_url ?? p.imagen_url) as string}
                  alt={p.titulo ?? ""}
                  width={400}
                  height={400}
                  unoptimized
                  className="w-full h-auto max-h-[32rem] object-contain bg-arena-100 border border-arena-200"
                />
              </a>
            ) : null}

            <div className="flex items-center gap-4 mt-5">
              {user ? (
                <form action={votar}>
                  <input type="hidden" name="publicacion" value={p.id} />
                  <input type="hidden" name="volver" value={`/p/${p.id}`} />
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
                  {p.votos_count ?? 0} {p.votos_count === 1 ? "respaldo" : "respaldos"}
                </span>
              )}

              {esAdmin && !p.oculto ? (
                <form action={ocultar}>
                  <input type="hidden" name="publicacion" value={p.id} />
                  <button type="submit" className={enlaceChico}>
                    Ocultar
                  </button>
                </form>
              ) : null}
            </div>
          </article>

          {/* ---------------- Comentarios ---------------- */}
          <section id="comentarios" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-2xl">
              Comentarios{" "}
              <span className="cifra text-base text-tinta-400">{p.comentarios_count ?? 0}</span>
            </h2>

            {error ? (
              <p
                role="alert"
                className="mt-5 border border-estrella-500/40 bg-white px-4 py-3 text-sm text-estrella-600"
              >
                {error}
              </p>
            ) : null}

            {aviso ? (
              <p
                role="status"
                className="mt-5 border border-monte-400/50 bg-white px-4 py-3 text-sm text-monte-600"
              >
                {aviso}
              </p>
            ) : null}

            {lista.length === 0 ? (
              <p className="text-sm text-tinta-600 mt-5">
                Nadie ha comentado todavía. {user ? "Sé el primero." : ""}
              </p>
            ) : (
              <ol className="flex flex-col gap-3 mt-5">
                {lista.map((c) => {
                  const quien = gente.get(c.usuario_id as string);
                  const esMio = user?.id === c.usuario_id;
                  // Lo puede borrar quien lo escribió y el dueño de la publicación.
                  const puedeBorrar = esMio || esMia;

                  return (
                    <li key={c.id} className="border border-arena-200 bg-white/60 p-4 flex gap-3">
                      <Link href={`/vecino/${c.usuario_id}`} className="shrink-0">
                        {quien?.foto ? (
                          <Image
                            src={quien.foto}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 object-cover border border-arena-200"
                          />
                        ) : (
                          <span className="block w-8 h-8 border border-arena-200 bg-arena-100" />
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <Link
                            href={`/vecino/${c.usuario_id}`}
                            className="text-tinta-900 hover:underline"
                          >
                            {quien?.nombre ?? "Un vecino"}
                          </Link>
                          <span className="cifra text-[10px] uppercase tracking-[0.14em] text-tinta-400 ml-2">
                            {fecha(c.creado_en)}
                          </span>
                        </p>

                        {c.oculto ? (
                          <p className="cifra text-[10px] uppercase tracking-[0.14em] text-estrella-600 mt-1">
                            Oculto por moderación
                          </p>
                        ) : null}

                        <p className="text-sm text-tinta-600 mt-1 leading-relaxed whitespace-pre-line break-words">
                          {c.texto}
                        </p>

                        {puedeBorrar || (esAdmin && !c.oculto) ? (
                          <div className="flex items-start gap-4 mt-2">
                            {puedeBorrar ? (
                              /* Confirmación sin JavaScript: primer clic abre, segundo borra. */
                              <details>
                                <summary className={`${enlaceChico} cursor-pointer list-none`}>
                                  Borrar
                                </summary>
                                <form action={borrarComentario} className="mt-2">
                                  <input type="hidden" name="publicacion" value={p.id} />
                                  <input type="hidden" name="comentario" value={c.id} />
                                  <button
                                    type="submit"
                                    className="cifra text-[11px] uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-3 py-2 transition-colors"
                                  >
                                    Sí, borrar
                                  </button>
                                </form>
                              </details>
                            ) : null}

                            {esAdmin && !c.oculto ? (
                              <form action={ocultarComentario}>
                                <input type="hidden" name="publicacion" value={p.id} />
                                <input type="hidden" name="comentario" value={c.id} />
                                <button type="submit" className={enlaceChico}>
                                  Ocultar
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* ---------------- Escribir ---------------- */}
            {user ? (
              p.oculto ? null : (
                <form action={comentar} className="mt-6">
                  <input type="hidden" name="publicacion" value={p.id} />
                  <input type="hidden" name="clave" value={claveEnvio} />
                  <label className={etiqueta} htmlFor="texto">
                    Tu comentario
                  </label>
                  <textarea
                    id="texto"
                    name="texto"
                    rows={3}
                    required
                    maxLength={1000}
                    className={campo}
                    placeholder="¿Fuiste? ¿Cómo estuvo?"
                  />
                  <BotonPublicar className={`${boton} mt-4`} enviando="Comentando…">
                    Comentar
                  </BotonPublicar>
                </form>
              )
            ) : (
              <p className="text-sm text-tinta-600 mt-6">
                <Link href="/entrar" className="underline hover:text-tinta-900">
                  Entra
                </Link>{" "}
                o{" "}
                <Link href="/entrar?modo=registro" className="underline hover:text-tinta-900">
                  crea tu cuenta
                </Link>{" "}
                para comentar.
              </p>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
