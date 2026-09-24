/** De la URL pública saca la ruta dentro del bucket "fotos", para poder borrarla. */
export function rutaDe(url: string | null | undefined) {
  if (!url) return null;
  const marca = "/object/public/fotos/";
  const i = url.indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}

/** Las rutas de varias URLs, sin repetir y sin huecos. */
export function rutasDe(...urls: (string | null | undefined)[]) {
  return [...new Set(urls.map(rutaDe).filter((r): r is string => Boolean(r)))];
}
