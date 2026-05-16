FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Use the preinstalled browsers in the Playwright base image.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install deps first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT (often 8080). Next needs -p.
# prisma migrate deploy aplica migraciones pendientes antes de arrancar.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"]

