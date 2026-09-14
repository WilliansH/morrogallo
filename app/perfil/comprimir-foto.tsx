"use client";

import { useRef, useState } from "react";

const LADO_MAX = 512;
const CALIDAD = 0.82;

/**
 * Mejora progresiva: si hay JavaScript, la foto se redimensiona en el
 * navegador antes de subirla. Sin JavaScript el input se comporta como
 * cualquier input de archivo y sube el original.
 *
 * No es cosmético: el plan gratuito de Supabase da 1 GB de storage y 5 GB
 * de egress al mes. Una foto de celular sin tocar pesa 3-5 MB; esta pesa
 * unos 60 KB.
 */
export default function ComprimirFoto({ className }: { className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [nota, setNota] = useState<string | null>(null);

  async function alElegir() {
    const archivo = input.current?.files?.[0];
    if (!archivo || !archivo.type.startsWith("image/")) return;

    try {
      const mapa = await createImageBitmap(archivo);
      const escala = Math.min(1, LADO_MAX / Math.max(mapa.width, mapa.height));

      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(mapa.width * escala);
      lienzo.height = Math.round(mapa.height * escala);

      const ctx = lienzo.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);

      const blob = await new Promise<Blob | null>((listo) =>
        lienzo.toBlob(listo, "image/jpeg", CALIDAD)
      );
      if (!blob || blob.size >= archivo.size) return;

      const reducida = new File([blob], "perfil.jpg", { type: "image/jpeg" });
      const bolsa = new DataTransfer();
      bolsa.items.add(reducida);
      if (input.current) input.current.files = bolsa.files;

      setNota(
        `Lista para subir: ${Math.round(blob.size / 1024)} KB (original ${Math.round(
          archivo.size / 1024
        )} KB).`
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
        onChange={alElegir}
        required
      />
      {nota ? <p className="text-xs text-monte-600 mt-2">{nota}</p> : null}
    </>
  );
}
