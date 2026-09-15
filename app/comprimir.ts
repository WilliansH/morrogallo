/**
 * Reducir imágenes en el navegador antes de subirlas.
 *
 * Lo comparten la caja de publicar y el panel de perfil. No es cosmético: el
 * plan gratuito de Supabase da 1 GB de storage y 5 GB de egress al mes, y lo
 * que se acaba primero es el egress. Cada KB que no sube, no se baja después
 * en cada visita al feed.
 *
 * Sale en WebP cuando el navegador sabe hacerlo —pesa como un 30% menos que
 * el JPEG con la misma pinta— y en JPEG cuando no.
 */

export const CALIDAD = 0.72;

function sacar(lienzo: HTMLCanvasElement, tipo: string) {
  return new Promise<Blob | null>((listo) =>
    // Si el navegador no sabe ese formato, toBlob devuelve PNG sin avisar:
    // por eso se comprueba el tipo de lo que devolvió, no si devolvió algo.
    lienzo.toBlob((b) => listo(b && b.type === tipo ? b : null), tipo, CALIDAD)
  );
}

export async function reducir(archivo: File, lado: number, base: string) {
  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(mapa.width, mapa.height));

  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);

  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);

  const blob = (await sacar(lienzo, "image/webp")) ?? (await sacar(lienzo, "image/jpeg"));
  if (!blob) return null;

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${base}.${extension}`, { type: blob.type });
}
