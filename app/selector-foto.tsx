"use client";

import { useEffect, useRef, useState } from "react";

import { reducir } from "./comprimir";

/** Lo que aguanta una Server Action (next.config), menos el sobre del formulario. */
const TOPE_ORIGINAL = 4 * 1024 * 1024 - 64 * 1024;

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/**
 * Elegir una foto, verla antes de subirla y mandarla ya reducida.
 *
 * Del archivo salen dos: una grande y una mini (los lados los decide quien lo
 * usa). Mientras se reducen, los botones de enviar del formulario quedan
 * apagados: si alguien apretaba "Subir" en ese segundo se iba el original del
 * celular, que pasa del tope de la Server Action y la subida moría sin decir
 * por qué.
 *
 * Sin JavaScript es un input de archivo cualquiera y sube el original.
 */
export default function SelectorFoto({
  className,
  ladoGrande,
  ladoMini,
  required,
  forma = "libre",
}: {
  className?: string;
  ladoGrande: number;
  ladoMini: number;
  required?: boolean;
  /** "cuadro" para el avatar: la vista previa se recorta como se verá. */
  forma?: "libre" | "cuadro";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [estado, setEstado] = useState<"nada" | "preparando" | "lista" | "error">("nada");
  const [nota, setNota] = useState<string | null>(null);

  // La URL de la vista previa ocupa memoria hasta que se suelta.
  useEffect(() => {
    return () => {
      if (vista) URL.revokeObjectURL(vista);
    };
  }, [vista]);

  function botones(apagados: boolean) {
    input.current?.form
      ?.querySelectorAll<HTMLButtonElement>("button[type=submit]")
      .forEach((b) => {
        b.disabled = apagados;
      });
  }

  async function alElegir() {
    const archivo = input.current?.files?.[0];

    if (!archivo) {
      setVista(null);
      setEstado("nada");
      setNota(null);
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      setEstado("error");
      setNota("Eso no es una imagen.");
      return;
    }

    setVista(URL.createObjectURL(archivo));
    setEstado("preparando");
    setNota(null);
    botones(true);

    try {
      const [mini, grande] = await Promise.all([
        reducir(archivo, ladoMini, "mini"),
        reducir(archivo, ladoGrande, "grande"),
      ]);

      if (!mini || !grande) throw new Error("sin lienzo");

      const bolsa = new DataTransfer();
      bolsa.items.add(mini);
      bolsa.items.add(grande);
      if (input.current) input.current.files = bolsa.files;

      setEstado("lista");
      setNota(`Lista: ${kb(grande.size)} (el original pesaba ${kb(archivo.size)}).`);
    } catch {
      // No se pudo reducir (un formato raro, un navegador viejo): se sube el
      // original si cabe, y si no, se dice antes de que lo intenten.
      if (archivo.size > TOPE_ORIGINAL) {
        setEstado("error");
        setNota("No pudimos achicar esta imagen y pesa más de 4 MB. Prueba con otra.");
        if (input.current) input.current.value = "";
        setVista(null);
      } else {
        setEstado("lista");
        setNota(null);
      }
    } finally {
      botones(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        className={className}
        id="foto"
        name="foto"
        type="file"
        accept="image/*"
        multiple
        onChange={alElegir}
        required={required}
      />

      {vista ? (
        <div
          className={`vista-previa relative mt-4 overflow-hidden border border-arena-200 bg-arena-100 ${
            forma === "cuadro" ? "w-28 h-28" : "max-w-xs"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- es un blob local, no hay nada que optimizar */}
          <img
            src={vista}
            alt="Vista previa de la foto elegida"
            className={`block w-full ${
              forma === "cuadro" ? "h-full object-cover" : "h-auto max-h-64 object-contain"
            } transition-[filter,opacity] duration-500 ${
              estado === "preparando" ? "blur-[2px] opacity-70" : ""
            }`}
          />
          {estado === "preparando" ? <span className="barrido" aria-hidden /> : null}
        </div>
      ) : null}

      <p
        aria-live="polite"
        className={`text-xs mt-2 min-h-4 ${
          estado === "error" ? "text-estrella-600" : "text-monte-600"
        }`}
      >
        {estado === "preparando" ? "Preparando la foto…" : nota}
      </p>
    </div>
  );
}
