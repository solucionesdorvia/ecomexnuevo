import type { Metadata, Viewport } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111A",
};

export const metadata: Metadata = {
  title: "E-COMEX — Calculadora de costos de importación a Argentina",
  description:
    "Calculá gratis cuánto cuesta importar a Argentina. Clasificación NCM, aranceles, flete e impuestos en minutos. La mejor calculadora de importaciones del país.",
  metadataBase: new URL("https://e-comex.app"),
  keywords: [
    "cuánto cuesta importar a argentina",
    "calculadora costos importación argentina",
    "calculadora importaciones",
    "costos importación argentina",
    "clasificación NCM argentina",
    "aranceles importación argentina",
    "cotizar importación",
  ],
  openGraph: {
    title: "E-COMEX — Calculadora de importaciones a Argentina",
    description: "Calculá gratis cuánto cuesta importar a Argentina. NCM, aranceles y landed cost en minutos.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className="dark">
      <body
        className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
