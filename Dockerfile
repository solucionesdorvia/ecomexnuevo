# ── Stage 1: build ───────────────────────────────────────────────────────────
# Imagen slim sin browsers — solo necesitamos Node para compilar Next.js.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# Usamos node slim + instalamos SOLO Chromium de Playwright (~130 MB vs ~2.5 GB
# de la imagen playwright completa). Esto reduce el tamaño final ~5x y acelera
# el "exporting to docker image format" de Railway de 30+ min a ~3 min.
FROM node:20-bookworm-slim

WORKDIR /app

# Copiar artefactos del build
COPY --from=builder /app/.next          ./.next
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package.json   ./package.json
COPY --from=builder /app/public         ./public
COPY --from=builder /app/data           ./data

# Instalar Chromium + sus dependencias de sistema via Playwright.
# PLAYWRIGHT_BROWSERS_PATH=/ms-playwright → Playwright instala ahí y lo busca ahí.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium --with-deps \
    && rm -rf /var/lib/apt/lists/*

# En runtime no queremos que Playwright intente descargar nada más.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

# Railway inyecta PORT (suele ser 8080). Next.js necesita -p.
CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"]
