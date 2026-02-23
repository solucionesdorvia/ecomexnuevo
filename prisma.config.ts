import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer DIRECT_URL for Prisma CLI migrations if provided (Neon non-pooler endpoint).
    // Fallback to DATABASE_URL (pooled) for simpler setups.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});

