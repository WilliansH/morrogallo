/**
 * MORROGALLO — la mascota del portal.
 *
 * El morrocoy volador de la leyenda de Puerto Píritu, el mismo que está en el
 * escudo del municipio: cuerpo de morrocoy con cabeza y cola de gallo.
 *
 * Va en línea y no como imagen. Así no gasta una petición ni egress de
 * Supabase, se ve nítido en cualquier tamaño y no hay nada que subir a
 * storage. Los colores y la animación viven en globals.css (bloque
 * "MORROGALLO"), así que la piel se cambia con una clase:
 *
 *   <Morrogallo />                  a color, sobre fondo claro
 *   <Morrogallo piel="contra" />    crema y oro sobre mar-900 — la principal
 *   <Morrogallo piel="tinta" />     una sola tinta, hereda el color del texto
 *
 * La animación es CSS pura, así que también se mueve en el visor in-app de
 * WhatsApp, y se queda quieta con prefers-reduced-motion.
 */

type Piel = "color" | "contra" | "tinta";

const PIEL: Record<Piel, string> = {
  color: "",
  contra: "morro-contra",
  tinta: "morro-tinta",
};

type Props = {
  piel?: Piel;
  className?: string;
  /** Texto para lectores de pantalla. Vacío = puramente decorativo. */
  alt?: string;
  /** Deja el dibujo quieto (para tamaños chicos). */
  quieto?: boolean;
};

/** El dibujo. Se reutiliza tal cual dentro del sello. */
function Dibujo() {
  return (
    <>
      <ellipse className="p-shadow" cx="214" cy="268" rx="132" ry="11" />

      <g className="morro-cuerpo">
        {/* patas del lado lejano */}
        <rect className="p-leg-dark" x="152" y="184" width="34" height="66" rx="15" />
        <rect className="p-leg-dark" x="246" y="184" width="34" height="62" rx="15" />

        {/* cola: cuatro plumas que suben, cruzan arriba y caen */}
        <g className="morro-cola">
          <path
            className="p-t1"
            d="M290 184 C314 150 326 60 382 54 C410 51 420 106 404 148 C402 106 396 76 374 74 C342 78 334 152 306 194 Z"
          />
          <path
            className="p-t2"
            d="M292 192 C314 164 326 84 370 80 C394 77 402 122 390 162 C390 124 384 98 364 98 C336 102 330 162 308 200 Z"
          />
          <path
            className="p-t3"
            d="M294 198 C316 178 328 106 360 104 C380 103 386 140 376 174 C377 142 370 122 354 122 C332 126 328 168 310 204 Z"
          />
          <path
            className="p-t4"
            d="M292 202 C310 190 326 178 342 182 C356 186 360 198 354 212 C351 200 342 192 332 194 C320 197 306 206 296 212 Z"
          />
          <g className="p-shaft">
            <path d="M298 188 C320 158 330 70 382 62" />
            <path d="M300 196 C320 170 330 92 370 88" />
          </g>
        </g>

        {/* cuello: sale de adentro del caparazón, por la abertura de adelante */}
        <g className="morro-cuello">
          <path className="p-plume" d="M84 94 C82 134 104 174 136 202 L170 188 C138 168 124 134 126 94 Z" />
          <g className="p-hackle">
            <path d="M98 112 C96 146 112 174 138 196" />
            <path d="M116 106 C112 142 128 168 154 188" />
          </g>

          <g transform="translate(-20,-8)">
            {/* barbas */}
            <path className="p-crest" d="M70 106 C60 122 64 142 76 140 C86 138 80 118 76 104 Z" />
            <path className="p-crest" d="M84 104 C72 124 76 152 94 150 C108 148 104 122 96 104 Z" />

            <ellipse className="p-plume" cx="116" cy="94" rx="36" ry="31" />

            {/* pico ganchudo */}
            <path className="p-plume-dark" d="M92 80 C74 82 56 90 44 104 C50 108 58 108 64 104 C72 96 82 92 92 92 Z" />
            <path className="p-plume-dark" d="M92 96 C80 96 68 100 62 106 C70 110 82 112 92 110 Z" />
            <path className="p-mouth" d="M52 101 C66 98 79 97 92 97" />

            {/* cresta */}
            <g className="morro-cresta">
              <path
                className="p-crest"
                d="M82 80 C76 64 80 48 92 44 C88 54 88 60 94 66 C96 50 106 30 120 28 C114 40 112 52 116 62 C120 44 132 24 148 26 C140 38 138 50 142 62 C148 46 160 32 174 38 C166 50 162 62 168 74 C174 70 182 74 178 88 C152 96 106 94 82 80 Z"
              />
            </g>

            <g className="morro-ojo">
              <ellipse className="p-eye" cx="118" cy="88" rx="12" ry="12" />
              <circle className="p-pupil" cx="114" cy="89" r="5.5" />
            </g>
          </g>
        </g>

        {/* caparazón */}
        <path className="p-shell" d="M112 200 C112 124 158 84 214 84 C270 84 316 124 316 200 Z" />

        {/* cinco escamas curvas: tres arriba, dos en el medio */}
        <g className="p-scute">
          <path transform="translate(162,134) rotate(-32)" d="M-25 11 C-25 -8 -16 -18 0 -18 C16 -18 25 -8 25 11 C16 17 -16 17 -25 11 Z" />
          <path transform="translate(214,116)" d="M-28 12 C-28 -10 -18 -20 0 -20 C18 -20 28 -10 28 12 C18 19 -18 19 -28 12 Z" />
          <path transform="translate(266,134) rotate(32)" d="M-25 11 C-25 -8 -16 -18 0 -18 C16 -18 25 -8 25 11 C16 17 -16 17 -25 11 Z" />
          <path transform="translate(184,177) rotate(-12)" d="M-26 10 C-26 -8 -17 -16 0 -16 C17 -16 26 -8 26 10 C17 16 -17 16 -26 10 Z" />
          <path transform="translate(244,177) rotate(12)" d="M-26 10 C-26 -8 -17 -16 0 -16 C17 -16 26 -8 26 10 C17 16 -17 16 -26 10 Z" />
        </g>

        <rect className="p-rim" x="104" y="194" width="220" height="22" rx="11" />
        <g className="p-line">
          <path d="M142 199 V211" />
          <path d="M178 199 V211" />
          <path d="M214 199 V211" />
          <path d="M250 199 V211" />
          <path d="M286 199 V211" />
        </g>

        {/* patas del lado cercano */}
        <rect className="p-leg" x="126" y="186" width="44" height="66" rx="17" />
        <rect className="p-leg" x="264" y="186" width="44" height="62" rx="17" />
        <path className="p-leg-dark" d="M118 246 h58 a10 10 0 0 1 10 10 v4 a6 6 0 0 1 -6 6 h-62 a10 10 0 0 1 -10 -10 z" />
        <path className="p-leg-dark" d="M258 244 h54 a10 10 0 0 1 10 10 v4 a6 6 0 0 1 -6 6 h-58 a10 10 0 0 1 -10 -10 z" />
        <g className="p-plume-dark">
          <path d="M118 252 L104 258 L119 263 Z" />
          <path d="M258 250 L245 256 L259 261 Z" />
        </g>
      </g>
    </>
  );
}

/** La mascota de perfil: la pieza principal del sitio. */
export default function Morrogallo({ piel = "color", className = "", alt = "", quieto = false }: Props) {
  return (
    <svg
      viewBox="0 0 420 300"
      className={`morro ${PIEL[piel]} ${quieto ? "morro-quieto" : ""} ${className}`}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <Dibujo />
    </svg>
  );
}

/**
 * El sello: el mismo dibujo dentro de un disco, como el escudo del municipio.
 * Para papelería, foto de perfil y cualquier sitio cuadrado o redondo.
 * `id` solo hace falta si hay más de un sello en la misma página.
 */
export function MorrogalloSello({
  piel = "contra",
  className = "",
  alt = "",
  quieto = true,
  id = "morro-sello",
}: Props & { id?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`morro ${PIEL[piel]} ${quieto ? "morro-quieto" : ""} ${className}`}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <clipPath id={`${id}-clip`}>
        <circle cx="100" cy="100" r="88" />
      </clipPath>
      <circle className="p-seal-bg" cx="100" cy="100" r="96" />
      <g clipPath={`url(#${id}-clip)`} style={{ ["--m-shadow" as string]: "transparent" }}>
        <g transform="translate(6,29) scale(0.436)">
          <Dibujo />
        </g>
      </g>
      <circle className="p-seal-ring" cx="100" cy="100" r="88" strokeWidth="3" />
      <circle className="p-seal-ring" cx="100" cy="100" r="80" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

/**
 * La marca chiquita: cabeza, cresta y caparazón, sin cola ni patas. Es el
 * mismo dibujo de app/icon.svg. A 32px el sello completo se ensucia; esto
 * aguanta. Nunca se anima.
 */
export function MorrogalloMini({ piel = "contra", className = "", alt = "" }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`morro morro-quieto ${PIEL[piel]} ${className}`}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <rect className="p-seal-bg" width="64" height="64" rx="14" />
      <path className="p-shell" d="M13 48 C13 29 25 21 35 21 C48 21 55 32 55 48 Z" />
      <path
        className="p-scute"
        strokeWidth="2.5"
        transform="translate(34,35)"
        d="M-11 4 C-11 -4 -7 -8 0 -8 C7 -8 11 -4 11 4 C7 7 -7 7 -11 4 Z"
      />
      <rect className="p-rim" x="8" y="45" width="50" height="9" rx="4.5" />
      <path className="p-crest" d="M12 14 C9 4 17 0 20 9 C22 0 30 2 29 11 C34 4 40 9 36 18 C28 22 17 20 12 14 Z" />
      <circle className="p-plume" cx="24" cy="24" r="12" />
      <path className="p-plume-dark" d="M15 19 C8 20 4 24 3 28 C7 30 12 29 15 26 C17 23 19 22 22 22 Z" />
      <circle className="p-seal-bg" cx="28" cy="22" r="4" />
    </svg>
  );
}
