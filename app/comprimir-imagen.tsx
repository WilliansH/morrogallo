"use client";

import { useRef, useState } from "react";

import { reducir } from "./comprimir";

const LADO_GRANDE = 1024;
const LADO_MINI = 320;

/**
 * Del archivo que elige la persona salen dos: una miniatura de 320px para el
 * feed y una de 1024px para verla completa. El feed solo carga miniaturas, y
 * de eso depende que el egress del plan gratuito alcance.
 *
 * Sin JavaScript sube el original y el servidor lo usa para las dos cosas.
 * Menos eficiente, pero funciona: esa es la regla del sitio.
 */
export default function ComprimirImagen({ className }: { className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [nota, setNota] = useState<string | null>(null);

  async function alElegir() {
    const archivo = input.current?.files?.[0];
    if (!archivo || !archivo.type.startsWith("image/")) return;

    try {
      const [mini, grande] = await Promise.all([
        reducir(archivo, LADO_MINI, "mini"),
        reducir(archivo, LADO_GRANDE, "grande"),
      ]);

      if (!mini || !grande) return;

      const bolsa = new DataTransfer();
      bolsa.items.add(mini);
      bolsa.items.add(grande);
      if (input.current) input.current.files = bolsa.files;

      setNota(
        `Lista: ${Math.round(grande.size / 1024)} KB y miniatura de ${Math.round(
          mini.size / 1024
        )} KB (original ${Math.round(archivo.size / 1024)} KB).`
      );
    } catch {
      // Si algo falla se sube el original tal cual.
    }
  }

  return (
    <>
      <input
        ref={input}
        className={className}
        id="foto"
        name="foto"
        type="file"
        accept="image/*"
        multiple
        onChange={alElegir}
      />
      {nota ? <p className="text-xs text-monte-600 mt-2">{nota}</p> : null}
    </>
  );
}
