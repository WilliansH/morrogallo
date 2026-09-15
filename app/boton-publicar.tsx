"use client";

import { useFormStatus } from "react-dom";

/**
 * Botón de enviar que se apaga mientras el formulario está en camino.
 *
 * Sin esto, subir una foto tarda unos segundos sin que nada se mueva en
 * pantalla: la gente aprieta otra vez y publica dos veces. Esto lo evita en
 * el 99% de los casos; el que no, lo para la base con la llave de un solo uso.
 *
 * Sin JavaScript el botón se pinta normal y funciona igual: `pending` es
 * false en el servidor.
 */
export default function BotonPublicar({
  className,
  children,
  enviando,
}: {
  className?: string;
  children: string;
  enviando: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:opacity-60 disabled:cursor-progress`}
    >
      {pending ? enviando : children}
    </button>
  );
}
