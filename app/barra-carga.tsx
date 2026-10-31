"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * La rayita de arriba mientras llega la página.
 *
 * Las páginas se arman en el servidor contra Supabase: entre el toque y la
 * página nueva pasa casi un segundo sin que nada se mueva, y la gente toca
 * otra vez. Arranca con cualquier clic a un enlace interno y termina cuando
 * cambia la URL. Si nunca cambia (un enlace roto, sin señal), se apaga sola.
 */
export default function BarraCarga() {
  const pathname = usePathname();
  const params = useSearchParams();
  const barra = useRef<HTMLDivElement>(null);
  const corte = useRef<ReturnType<typeof setTimeout>>(undefined);

  // La barra se maneja directo en el DOM: es pura decoración y así no
  // re-renderiza nada en cada clic.
  function poner(estado: "cargando" | "listo") {
    if (barra.current) barra.current.dataset.estado = estado;
  }

  // Llegó la página nueva.
  useEffect(() => {
    if (barra.current?.dataset.estado === "cargando") poner("listo");
    clearTimeout(corte.current);
  }, [pathname, params]);

  useEffect(() => {
    function alTocar(evento: MouseEvent) {
      // Sin mirar defaultPrevented: <Link> siempre lo cancela para navegar
      // por su cuenta, y por eso esto escucha en la fase de captura.
      if (evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

      const enlace = (evento.target as Element | null)?.closest?.("a");
      if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download")) return;

      const destino = new URL(enlace.href, location.href);
      if (destino.origin !== location.origin) return;

      // La misma página (o solo un #ancla): no hay nada que esperar.
      if (destino.pathname === location.pathname && destino.search === location.search) return;

      poner("cargando");
      clearTimeout(corte.current);
      corte.current = setTimeout(() => poner("listo"), 10_000);
    }

    document.addEventListener("click", alTocar, true);
    return () => document.removeEventListener("click", alTocar, true);
  }, []);

  return <div ref={barra} className="barra-carga" data-estado="quieto" aria-hidden />;
}
