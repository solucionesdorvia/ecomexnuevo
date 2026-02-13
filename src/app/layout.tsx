import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "E-Comex — Importá a Argentina con costos reales",
  description:
    "Obtené una estimación orientativa dentro del chat y validala con un especialista: producto, flete, impuestos, gestión, tiempos y total puesto en Argentina.",
  metadataBase: new URL("https://e-comex.app"),
  openGraph: {
    title: "E-Comex",
    description:
      "Chat inteligente de importación: entendé el costo real y validalo con un especialista antes de decidir.",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
