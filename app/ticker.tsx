import { consultarTasaBcv } from "@/lib/tasa/bcv";
import { consultarUcd } from "@/lib/tasa/ucd";

/**
 * Cinta superior con la tasa del BCV y la UCD.
 *
 * Es un Server Component: los dos valores llegan ya escritos en el HTML, así
 * que se ven igual en el visor de WhatsApp, sin JavaScript. Ninguno se
 * inventa: la tasa viene del BCV y la UCD, o la publicó un admin, o se calculó
 * del euro del BCV y va marcada "ref." para que nadie la confunda con la
 * oficial del municipio.
 *
 * Los dos valores salen casi siempre de la misma publicación del BCV, así que
 * la fecha se escribe una sola vez al final. Solo si difieren — cuando alguien
 * publicó una UCD a mano — cada una lleva la suya.
 */

const bolivares = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const diaYMes = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  timeZone: "America/Caracas",
});

function fechaCorta(iso: string | null | undefined) {
  if (!iso) return null;
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? null : diaYMes.format(f);
}

function Tenue({ children }: { children: React.ReactNode }) {
  return <span className="text-tinta-400">{children}</span>;
}

function Valor({
  etiqueta,
  monto,
  nota,
  fecha,
  fuente,
}: {
  etiqueta: string;
  monto: number | null | undefined;
  nota?: string;
  fecha: string | null;
  fuente?: string;
}) {
  if (monto === null || monto === undefined) {
    return (
      <span>
        {etiqueta} <Tenue>pendiente</Tenue>
      </span>
    );
  }

  return (
    <span title={fuente}>
      {etiqueta} {bolivares.format(monto)} <Tenue>Bs</Tenue>
      {nota ? <Tenue> · {nota}</Tenue> : null}
      {fecha ? <Tenue> · {fecha}</Tenue> : null}
    </span>
  );
}

export default async function Ticker() {
  const [tasa, ucd] = await Promise.all([consultarTasaBcv(), consultarUcd()]);

  const fechaBcv = fechaCorta(tasa?.fecha);
  const fechaUcd = fechaCorta(ucd?.fecha);

  // La misma fecha repetida dos veces es ruido: se saca al final.
  const fechaCompartida =
    fechaBcv !== null && fechaBcv === fechaUcd ? fechaBcv : null;

  return (
    <div className="bg-tinta-900 text-arena-100">
      <div className="mx-auto max-w-6xl px-6 py-2 flex flex-wrap items-center gap-x-8 gap-y-1 cifra text-[11px] uppercase tracking-[0.14em]">
        <Valor
          etiqueta="BCV"
          monto={tasa?.valor}
          fecha={fechaCompartida ? null : fechaBcv}
          fuente={tasa?.fuente}
        />

        <Valor
          etiqueta="UCD"
          monto={ucd?.valor}
          nota={ucd?.origen === "referencial" ? "ref." : undefined}
          fecha={fechaCompartida ? null : fechaUcd}
          fuente={ucd?.fuente}
        />

        {fechaCompartida ? <Tenue>al {fechaCompartida}</Tenue> : null}

        <span className="ml-auto text-tinta-400 normal-case tracking-normal">
          Anzoátegui, Venezuela
        </span>
      </div>
    </div>
  );
}
