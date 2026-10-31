import { ViewTransition } from "react";

/*
 * La animación según de dónde venga la navegación. Los enlaces la marcan con
 * transitionTypes: "nav-forward" al entrar a algo (una publicación, un
 * perfil), "nav-back" al volver. Lo que no trae marca —el menú, el botón atrás
 * del navegador— entra con un fundido.
 *
 * Va en cada página y no en el layout: el layout no se desmonta al navegar,
 * así que ahí nunca habría entrada ni salida.
 */
const SEGUN_TIPO = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "fundido",
};

/** Hacia adentro: feed → publicación, → perfil de un vecino. */
export const ADENTRO = ["nav-forward"];
/** De vuelta: ← Comunidad, ← Mi perfil. */
export const AFUERA = ["nav-back"];

export default function Transicion({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={SEGUN_TIPO} exit={SEGUN_TIPO} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * La foto de una publicación tiene el mismo nombre en el feed y en su página:
 * el navegador la lleva de un lugar al otro en vez de cambiarla de golpe.
 */
export function FotoViajera({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={`foto-${id}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
