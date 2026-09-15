import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { cerrarSesion } from "./entrar/acciones";
import Morrogallo from "./morrogallo";

/**
 * Barra superior, compartida por todas las páginas. Se trae la sesión ella
 * misma para que ninguna página tenga que pasársela.
 */
export default async function Nav() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase
        .from("perfiles")
        .select("nombre_visible, foto_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const comoSeLlama = perfil?.nombre_visible?.trim() || user?.email || "";

  return (
  <header className="sticky top-0 z-50 bg-arena-50/90 backdrop-blur border-b border-arena-200">
    <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 font-display text-xl tracking-tight text-tinta-900"
      >
        <Morrogallo className="h-11 w-auto shrink-0" />
        Morrogallo
      </Link>

      <ul className="hidden md:flex items-center gap-8 text-sm text-tinta-600">
        <li>
          <Link className="hover:text-tinta-900 transition-colors" href="/">
            Comunidad
          </Link>
        </li>
        <li>
          <Link className="hover:text-tinta-900 transition-colors" href="/penalver">
            Peñalver
          </Link>
        </li>
        <li>
          <Link className="hover:text-tinta-900 transition-colors" href="/estadisticas">
            Estadísticas
          </Link>
        </li>
      </ul>

      {user ? (
        <div className="flex items-center gap-4">
          <Link
            href="/perfil"
            className="flex items-center gap-3 group"
            title={user.email ?? ""}
          >
            {perfil?.foto_url ? (
              <Image
                src={perfil.foto_url}
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 object-cover border border-arena-200"
              />
            ) : null}
            <span className="text-sm text-tinta-600 group-hover:text-tinta-900 max-w-[16ch] truncate transition-colors">
              {comoSeLlama}
            </span>
          </Link>
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
  );
}
