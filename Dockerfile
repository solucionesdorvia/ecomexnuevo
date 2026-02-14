FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Install deps first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT (often 8080). Next needs -p.
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]

