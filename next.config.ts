import type { NextConfig } from "next";

const securityHeaders = [
  // Evita clickjacking — nunca embeber en iframes de otros dominios
  { key: "X-Frame-Options", value: "DENY" },
  // Previene MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla info de referrer en links externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Limita acceso a features del browser que no usamos
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: fuerza HTTPS por 1 año en producción
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // hero-3d.html se carga como iframe dentro de la landing desde el mismo origen.
        // X-Frame-Options: SAMEORIGIN lo permite; DENY lo bloquea y rompe la animación.
        source: "/hero-3d.html",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
