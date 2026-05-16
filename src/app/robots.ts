import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://e-comex.com.ar").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cotizador", "/clasificarncm", "/login", "/register", "/trust-compliance"],
        disallow: [
          "/app/",
          "/api/",
          "/operador/",
          "/cotizaciones/",
          "/interno/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
