import SelectorFoto from "./selector-foto";

/**
 * La foto de una publicación: una miniatura de 320px para el feed y una de
 * 1024px para verla completa. El feed solo carga miniaturas, y de eso depende
 * que el egress del plan gratuito alcance.
 */
export default function ComprimirImagen({ className }: { className?: string }) {
  return <SelectorFoto className={className} ladoGrande={1024} ladoMini={320} />;
}
