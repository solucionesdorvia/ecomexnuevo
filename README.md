# E‑Comex (SaaS) — Chat inteligente de importación

Plataforma web lista para evolucionar a producción, con flujo **landing → chat → cotización → decisión → contacto**.

## Qué incluye hoy

- **Landing premium** con hero de video (container) y CTA al chat.
- **Chat de importación** con estados y **tarjetas** de cotización (FOB, flete, impuestos, gestión, total, tiempos).
- **Conversión correcta**: **no** se pide contacto al inicio; solo después de que el usuario diga que quiere avanzar.
- **Persistencia real** (SQLite dev) con Prisma:
  - Guarda **cotizaciones anónimas** (cookie `ecomex_anon`)
  - Guarda **leads** (contacto) y vincula con la cotización
- **Scraper autenticado** (Playwright) con **sesión persistente**, activable por variables de entorno.
- **Cuentas opcionales** (`/account`) para historial (sin obligar login para cotizar).

## Requisitos

- Node.js 20+

## Setup

1) Instalar dependencias

```bash
npm install
```

2) Variables de entorno

- Copiá `.env.example` → `.env` y ajustá:
  - `DATABASE_URL` (dev por defecto: `file:./dev.db`)
  - `AUTH_JWT_SECRET` (cambiar en producción)
  - Scraper (ver abajo)

3) Prisma (migraciones + client)

```bash
npx prisma generate
npx prisma migrate dev
```

4) Video del container

- Colocá tu video en: `public/container.mp4`
- (Opcional) poster: `public/container-poster.jpg`

5) Correr en local

```bash
npm run dev
```

Abrí:
- Landing: `/`
- Chat: `/chat`
- Cuenta (opcional): `/account`

## Scraper autenticado (Playwright)

Por defecto está en modo stub para no depender de credenciales:

- `SCRAPER_STUB="true"`

Para activar scraping real:

- Seteá `SCRAPER_STUB="false"`
- Configurá OpenAI + PCRAM (para NCM y tasas oficiales):
  - `OPENAI_API_KEY` (y opcional `OPENAI_MODEL`)
  - `PCRAM_USER`, `PCRAM_PASS`
  - opcional: `PCRAM_STORAGE_STATE_PATH`, `PCRAM_CACHE_PATH`, `PCRAM_CACHE_TTL_DAYS`
  - debug: `PCRAM_DUMP_HTML=true` para dumpear HTML real a `./.scraper/`

Notas:
- Si no hay `OPENAI_API_KEY`, el sistema hace fallback y cotiza con heurísticas.
- Si no hay credenciales PCRAM, se clasifica NCM (si hay IA) pero no se obtienen tasas/intervenciones oficiales.

## Notas de arquitectura

- `src/app/page.tsx`: landing
- `src/app/chat/*`: UI del chat + transición visual
- `src/app/api/chat/route.ts`: endpoint del chat (cotiza + persiste + pide contacto solo al final)
- `src/lib/scraper/*`: scraper (stub + Playwright autenticado)
- `src/lib/url/urlAnalyzer.ts`: fetch/Playwright fallback + limpieza HTML + extracción de imágenes
- `src/lib/ai/ncmClassifier.ts`: clasificación NCM por IA (fallback seguro)
- `src/lib/pcram/pcramClient.ts`: login + scraping PCRAM + cache SQLite
- `src/lib/quote/*`: motor de cotización (heurístico hoy; listo para integrar tablas NCM/partners)
- `prisma/*`: esquema y migraciones

## Próximos pasos naturales (para precisión “real”)

- Clasificación NCM por IA + reglas (y/o fuente oficial/partner).
- Motor impositivo completo (CIF, alícuotas por NCM, percepciones por perfil fiscal).
- Cálculo de flete real (rate cards por origen/CBM/peso y modalidad).
- Workflow de “importación real” + tracking + operadores humanos.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
