import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __ecomex_sqlite_schema_ready: boolean | undefined;
}

function sqliteFileFromDatabaseUrl(url: string) {
  const u = String(url || "").trim();
  if (!u.startsWith("file:")) return null;
  const p = u.slice("file:".length);
  return p || null;
}

function ensureSqliteSchema() {
  // Only for sqlite URLs; no-op otherwise.
  if (globalThis.__ecomex_sqlite_schema_ready) return;
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePart = sqliteFileFromDatabaseUrl(url);
  if (!filePart) {
    globalThis.__ecomex_sqlite_schema_ready = true;
    return;
  }

  // Lazy require so this file stays Node-only (and avoids bundler surprises).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("node:path");

  const abs = path.isAbsolute(filePart)
    ? filePart
    : path.resolve(process.cwd(), filePart);

  const db = new BetterSqlite3(abs);
  try {
    db.pragma("foreign_keys = ON");
    const hasTable = (name: string) => {
      const row = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1"
        )
        .get(name);
      return Boolean(row?.name);
    };

    // If tables are missing (fresh Railway deploy), apply migrations bundled in repo.
    const needsCore = !hasTable("Quote") || !hasTable("Lead");
    const needsUser = !hasTable("User");
    if (!needsCore && !needsUser) {
      globalThis.__ecomex_sqlite_schema_ready = true;
      return;
    }

    const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      // Can't auto-migrate; mark ready to avoid repeated work.
      globalThis.__ecomex_sqlite_schema_ready = true;
      return;
    }

    const folders = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d: any) => d.isDirectory())
      .map((d: any) => d.name)
      .sort();

    for (const folder of folders) {
      const file = path.join(migrationsDir, folder, "migration.sql");
      if (!fs.existsSync(file)) continue;
      const sql = String(fs.readFileSync(file, "utf8") ?? "");
      if (!sql.trim()) continue;

      const isCore = /CREATE TABLE\s+"Quote"|CREATE TABLE\s+"Lead"/i.test(sql);
      const isUser = /CREATE TABLE\s+"User"/i.test(sql);
      if (isCore && !needsCore) continue;
      if (isUser && !needsUser) continue;

      // Execute SQL in one go (Prisma migrations are compatible with sqlite exec).
      db.exec(sql);
    }
  } catch {
    // If migration fails, we still allow the app to boot; Prisma queries will surface errors.
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
    globalThis.__ecomex_sqlite_schema_ready = true;
  }
}

ensureSqliteSchema();

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
    }),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

