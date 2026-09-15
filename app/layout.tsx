import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Reveal from "./reveal";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

/**
 * De dónde cuelgan las URL absolutas de las imágenes de compartir. Sin esto,
 * Next las resuelve contra localhost y el preview de WhatsApp sale roto.
 * En Vercel, VERCEL_PROJECT_PRODUCTION_URL siempre apunta al dominio de
 * producción, también desde un deploy de preview. Cuando haya dominio propio,
 * se pone NEXT_PUBLIC_SITE_URL y manda esa.
 */
const dondeVive =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3210");

export const metadata: Metadata = {
  metadataBase: new URL(dondeVive),
  title: {
    default: "Morrogallo — datos y voces del estado Anzoátegui",
    template: "%s · Morrogallo",
  },
  description:
    "Portal comunitario del estado Anzoátegui: estadísticas con fuente, verificadas por los vecinos, y las fotos y noticias de cada parroquia. Foco inicial en el Municipio Fernando de Peñalver.",
  applicationName: "Morrogallo",
  openGraph: {
    title: "Morrogallo — datos y voces del estado Anzoátegui",
    description:
      "Estadísticas con fuente, verificadas por los vecinos, y las fotos y noticias de cada parroquia.",
    locale: "es_VE",
    type: "website",
  },
};

// Marca el documento como "hay JavaScript" antes del primer pintado.
// Sin esta clase nada se oculta: el sitio se lee completo en visores
// in-app (WhatsApp) que no ejecutan scripts.
const marcarJs = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // El script de abajo le añade la clase "js" al <html> antes de que React
    // hidrate, así que el className del servidor y el del cliente difieren a
    // propósito. suppressHydrationWarning aplica solo a este nodo.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fraunces.variable} ${publicSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: marcarJs }} />
      </head>
      <body className="min-h-full flex flex-col bg-arena-50 text-tinta-900">
        {children}
        <Reveal />
      </body>
    </html>
  );
}
