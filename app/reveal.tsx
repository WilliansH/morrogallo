"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Reveal() {
  // El layout raíz no se vuelve a montar al navegar entre rutas, así que sin
  // esta dependencia el efecto corría una sola vez: al volver al inicio desde
  // /perfil los .reveal de la portada se quedaban en opacity 0 y la página se
  // veía en blanco.
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal:not(.visible)")
    );
    if (els.length === 0) return;

    const mostrarTodo = () => els.forEach((el) => el.classList.add("visible"));

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      mostrarTodo();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => io.observe(el));

    // Red de seguridad: si algo falla, el contenido aparece igual.
    const red = setTimeout(mostrarTodo, 1200);

    return () => {
      io.disconnect();
      clearTimeout(red);
    };
  }, [pathname]);

  return null;
}
