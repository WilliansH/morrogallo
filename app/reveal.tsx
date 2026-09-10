"use client";

import { useEffect } from "react";

export default function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const mostrarTodo = () => els.forEach((el) => el.classList.add("visible"));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    const red = setTimeout(mostrarTodo, 1200);

    return () => {
      io.disconnect();
      clearTimeout(red);
    };
  }, []);

  return null;
}
