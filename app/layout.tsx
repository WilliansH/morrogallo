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

export const metadata: Metadata = {
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
    <html
      lang="es"
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
