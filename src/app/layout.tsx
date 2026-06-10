import type { Metadata, Viewport } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "E-COMEX — Consultoría en Comercio Exterior",
  description:
    "Consultoría en comercio exterior e importaciones. Clasificación NCM, aranceles, flete e impuestos, financiamiento y gestión integral. Importá sin ser importador.",
  metadataBase: new URL("https://e-comex.com.ar"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-ecomex-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-ecomex-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/favicon-ecomex-192.png",
  },
  keywords: [
    "consultoría comercio exterior argentina",
    "importaciones argentina",
    "asesoría importaciones",
    "clasificación NCM argentina",
    "aranceles importación argentina",
    "costos importación argentina",
    "importar sin ser importador",
  ],
  openGraph: {
    title: "E-COMEX — Consultoría en Comercio Exterior",
    description: "Consultoría en comercio exterior e importaciones. NCM, aranceles, financiamiento y gestión integral.",
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
        {/* Google Tag Manager — container 1 */}
        <Script id="gtm-head-1" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PM5MMSLK');`}
        </Script>
        {/* Google Tag Manager — container 2 */}
        <Script id="gtm-head-2" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PSL2XL3');`}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) — container 1 */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PM5MMSLK"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* Google Tag Manager (noscript) — container 2 */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PSL2XL3"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
