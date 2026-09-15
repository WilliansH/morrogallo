import Link from "next/link";

import Morrogallo from "./morrogallo";

/** Pie compartido por todas las páginas. */
export default function Footer() {
  return (
  <footer className="bg-tinta-900 text-arena-100">
    <div className="mx-auto max-w-6xl px-6 py-14 grid sm:grid-cols-3 gap-10">
      <div>
        <Morrogallo piel="contra" className="w-44 mb-4" />
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
            <Link className="hover:text-arena-50 transition-colors" href="/">
              Comunidad
            </Link>
          </li>
          <li>
            <Link className="hover:text-arena-50 transition-colors" href="/penalver">
              Peñalver
            </Link>
          </li>
          <li>
            <Link className="hover:text-arena-50 transition-colors" href="/estadisticas">
              Estadísticas
            </Link>
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
      <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap justify-between gap-x-8 gap-y-2 cifra text-[11px] text-tinta-400">
        <p>
          Hecho en Puerto Píritu. Sitio desarrollado por{" "}
          <a
            href="https://biaseitsolutions.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-arena-100 hover:text-arena-50 underline underline-offset-2 transition-colors"
          >
            BiAse IT Solutions C.A.
          </a>
        </p>
        <p>
          Los colores son una aproximación a la bandera del municipio,
          pendiente de confirmación con la Alcaldía.
        </p>
      </div>
    </div>
  </footer>
  );
}
