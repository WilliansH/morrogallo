"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/", nombre: "Comunidad", activo: (p: string) => p === "/" || p.startsWith("/p/") },
  { href: "/penalver", nombre: "Peñalver", activo: (p: string) => p.startsWith("/penalver") },
  { href: "/estadisticas", nombre: "Estadísticas", activo: (p: string) => p.startsWith("/estadisticas") },
];

/** Los enlaces de la barra de arriba, con la sección actual marcada. */
export function MenuArriba() {
  const ruta = usePathname();

  return (
    <ul className="hidden md:flex items-center gap-8 text-sm text-tinta-600">
      {SECCIONES.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            aria-current={s.activo(ruta) ? "page" : undefined}
            className="subraya pb-0.5 hover:text-tinta-900 aria-[current=page]:text-tinta-900"
          >
            {s.nombre}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * En el celular la barra de arriba no tiene espacio para las secciones: van
 * abajo, al alcance del pulgar, como en cualquier red social. Antes en el
 * celular no había forma de llegar a Peñalver ni a Estadísticas salvo
 * bajando hasta el pie de página.
 */
export function MenuAbajo({ conCuenta }: { conCuenta: boolean }) {
  const ruta = usePathname();

  const items = [
    ...SECCIONES,
    conCuenta
      ? {
          href: "/perfil",
          nombre: "Mi perfil",
          activo: (p: string) => p.startsWith("/perfil") || p.startsWith("/vecino/"),
        }
      : { href: "/entrar", nombre: "Entrar", activo: (p: string) => p.startsWith("/entrar") },
  ];

  return (
    <nav
      aria-label="Secciones"
      style={{ viewTransitionName: "barra-movil" }}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-arena-200 bg-arena-50/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {items.map((s) => {
          const activo = s.activo(ruta);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={activo ? "page" : undefined}
                className="pulsable relative flex h-14 items-center justify-center cifra text-[10px] uppercase tracking-[0.12em] text-tinta-400 aria-[current=page]:text-tinta-900"
              >
                {/* La rayita roja se estira sobre la sección actual. */}
                <span
                  aria-hidden
                  className={`absolute top-0 inset-x-4 h-0.5 bg-estrella-500 origin-center transition-transform duration-300 ease-[var(--ease-morro)] ${
                    activo ? "scale-x-100" : "scale-x-0"
                  }`}
                />
                {s.nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
