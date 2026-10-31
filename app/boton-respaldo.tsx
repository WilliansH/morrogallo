"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

const nada = () => () => {};

/**
 * El botón de respaldar, adentro de un <form action={votar}>.
 *
 * Mientras el voto viaja, el botón ya muestra el resultado: "Respaldada" y el
 * número uno más arriba. Cuando el servidor responde, manda lo que diga la
 * base. Sin JavaScript es un botón de enviar común.
 *
 * El campo "js" le avisa al servidor que aquí hay JavaScript: entonces no
 * redirige, solo refresca, y la persona se queda donde estaba en el feed.
 */
export default function BotonRespaldo({
  votado,
  votos,
}: {
  votado: boolean;
  votos: number;
}) {
  const { pending } = useFormStatus();
  // false en el HTML del servidor, true en cuanto el navegador hidrata.
  const hayJs = useSyncExternalStore(
    nada,
    () => true,
    () => false
  );

  const mostrarVotado = pending ? !votado : votado;
  const mostrarVotos = pending ? votos + (votado ? -1 : 1) : votos;

  return (
    <>
      {hayJs ? <input type="hidden" name="js" value="1" /> : null}
      <button
        type="submit"
        aria-pressed={mostrarVotado}
        className={`cifra text-[11px] uppercase tracking-[0.14em] border px-4 py-2 ${
          mostrarVotado
            ? "border-monte-400/50 bg-monte-400/10 text-monte-600"
            : "border-arena-200 text-tinta-600 hover:border-tinta-400 hover:text-tinta-900"
        }`}
      >
        {mostrarVotado ? "Respaldada" : "Respaldar"} ·{" "}
        {/* Salta al tocarlo, no al cargar la página. */}
        <span key={String(pending)} className={pending ? "salta" : undefined}>
          {mostrarVotos}
        </span>
      </button>
    </>
  );
}
