import SelectorFoto from "../selector-foto";

/**
 * La foto de perfil: una de 512px para el perfil y una de 96px para el avatar
 * del feed y de la barra, que se ven a 28 y 32 píxeles. La mini es la que
 * importa: el feed muestra veinte avatares por pantalla.
 */
export default function ComprimirFoto({ className }: { className?: string }) {
  return (
    <SelectorFoto
      className={className}
      ladoGrande={512}
      ladoMini={96}
      forma="cuadro"
      required
    />
  );
}
