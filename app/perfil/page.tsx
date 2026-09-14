import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { cambiarClave, guardarDatos, subirFoto } from "./acciones";
import ComprimirFoto from "./comprimir-foto";

export const metadata = { title: "Mi perfil" };

const campo =
  "w-full border border-arena-200 bg-white px-4 py-3 text-tinta-900 placeholder:text-tinta-400 focus:border-mar-500 focus:outline-none";
const etiqueta =
  "cifra block text-[11px] uppercase tracking-[0.14em] text-tinta-600 mb-2";
const boton =
  "cifra text-xs uppercase tracking-[0.14em] bg-estrella-500 hover:bg-estrella-600 text-arena-50 px-6 py-3 transition-colors";
const seccion = "border border-arena-200 bg-white/60 p-7";
const titulo = "font-display text-2xl";

export default async function Perfil({
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
    .select("nombre_visible, telefono, direccion, foto_url, parroquia_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: parroquias } = await supabase
    .from("parroquias")
    .select("id, nombre, es_capital")
    .order("es_capital", { ascending: false })
    .order("nombre", { ascending: true });

  return (
    <main className="flex-1 bg-arena-50">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <Link
          href="/"
          className="cifra text-[11px] uppercase tracking-[0.14em] text-tinta-400 hover:text-tinta-900 transition-colors"
        >
          ← Morrogallo
        </Link>

        <h1 className="font-display text-4xl mt-6">Mi perfil</h1>
        <p className="cifra text-sm text-tinta-400 mt-2">{user.email}</p>

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

        {/* ---------------- Foto ---------------- */}
        <section className={`${seccion} mt-10`}>
          <h2 className={titulo}>Foto</h2>

          <div className="flex items-center gap-6 mt-5">
            {perfil?.foto_url ? (
              <Image
                src={perfil.foto_url}
                alt="Tu foto de perfil"
                width={80}
                height={80}
                className="w-20 h-20 object-cover border border-arena-200"
              />
            ) : (
              <div className="w-20 h-20 border border-arena-200 bg-arena-100 flex items-center justify-center cifra text-xs text-tinta-400">
                sin foto
              </div>
            )}

            <form action={subirFoto} className="flex-1">
              <label className={etiqueta} htmlFor="foto">
                Elegir imagen
              </label>
              <ComprimirFoto className="block w-full text-sm text-tinta-600 file:cifra file:mr-4 file:border file:border-arena-200 file:bg-arena-100 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-tinta-600" />
              <button className={`${boton} mt-4`} type="submit">
                Subir foto
              </button>
            </form>
          </div>
        </section>

        {/* ---------------- Datos ---------------- */}
        <form action={guardarDatos} className={`${seccion} mt-6`}>
          <h2 className={titulo}>Tus datos</h2>
          <p className="text-sm text-tinta-600 mt-2 leading-relaxed">
            Solo el nombre, la foto y la parroquia se ven en el sitio. El
            teléfono y la dirección son privados.
          </p>

          <div className="flex flex-col gap-5 mt-6">
            <div>
              <label className={etiqueta} htmlFor="nombre">
                Cómo quieres que te vean
              </label>
              <input
                className={campo}
                id="nombre"
                name="nombre"
                type="text"
                maxLength={60}
                defaultValue={perfil?.nombre_visible ?? ""}
                placeholder="Tu nombre o apodo"
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="telefono">
                Teléfono
              </label>
              <input
                className={campo}
                id="telefono"
                name="telefono"
                type="tel"
                maxLength={30}
                defaultValue={perfil?.telefono ?? ""}
                placeholder="0424 000 0000"
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="direccion">
                Dirección
              </label>
              <input
                className={campo}
                id="direccion"
                name="direccion"
                type="text"
                maxLength={160}
                defaultValue={perfil?.direccion ?? ""}
                placeholder="Sector, calle, referencia"
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="parroquia">
                Tu parroquia
              </label>
              <select
                className={campo}
                id="parroquia"
                name="parroquia"
                defaultValue={perfil?.parroquia_id ?? ""}
              >
                <option value="">Sin elegir</option>
                {(parroquias ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.es_capital ? " (capital)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button className={`${boton} self-start`} type="submit">
              Guardar datos
            </button>
          </div>
        </form>

        {/* ---------------- Contraseña ---------------- */}
        <form action={cambiarClave} className={`${seccion} mt-6`}>
          <h2 className={titulo}>Cambiar contraseña</h2>

          <div className="flex flex-col gap-5 mt-6">
            <div>
              <label className={etiqueta} htmlFor="clave">
                Contraseña nueva
              </label>
              <input
                className={campo}
                id="clave"
                name="clave"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="clave2">
                Repítela
              </label>
              <input
                className={campo}
                id="clave2"
                name="clave2"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button className={`${boton} self-start`} type="submit">
              Cambiar contraseña
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
