"use client";

import { useRef, useState } from "react";

import { reducir } from "../comprimir";

const LADO_GRANDE = 512;
const LADO_MINI = 96;

/**
 * De la foto de perfil salen dos: una de 512px para el panel y una de 96px
 * para el avatar del feed y de la barra, que se ven a 28 y 32 píxeles.
 *
 * La mini es la que importa: el feed muestra veinte avatares por pantalla, y
 * con la foto grande eso pesaba más que todas las miniaturas de las
 * publicaciones juntas.
 *
 * Mejora progresiva: sin JavaScript el input se comporta como cualquier input
 * de archivo y sube el original.
 */
export default function ComprimirFoto({ className }: { className?: string }) {
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
        `Lista para subir: ${Math.round(grande.size / 1024)} KB y avatar de ${Math.round(
          mini.size / 1024
        )} KB (original ${Math.round(archivo.size / 1024)} KB).`
      );
    } catch {
      // Si algo falla se sube el original y ya.
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
        required
      />
      {nota ? <p className="text-xs text-monte-600 mt-2">{nota}</p> : null}
    </>
  );
}
