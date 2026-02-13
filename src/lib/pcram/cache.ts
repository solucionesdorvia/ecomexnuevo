import Database from "better-sqlite3";

export type CacheEntry<T> = {
  key: string;
  value: T;
  createdAt: number; // epoch ms
};

export class CacheManager {
  private db: Database.Database;
  private ttlMs: number;
  private table: string;

  constructor(opts?: { path?: string; ttlDays?: number; tableName?: string }) {
    const path = opts?.path ?? "pcram_cache.db";
    const ttlDays = opts?.ttlDays ?? 30;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    const tableName = opts?.tableName ?? "ncm_cache";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error("Invalid cache table name");
    }
    this.table = tableName;

    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  get<T>(key: string): T | null {
    const row = this.db
      .prepare(`SELECT value_json, created_at FROM ${this.table} WHERE key = ?`)
      .get(key) as { value_json: string; created_at: number } | undefined;
    if (!row) return null;
    if (Date.now() - row.created_at > this.ttlMs) {
      this.db.prepare(`DELETE FROM ${this.table} WHERE key = ?`).run(key);
      return null;
    }
    try {
      return JSON.parse(row.value_json) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ${this.table} (key, value_json, created_at) VALUES (?, ?, ?)`
      )
      .run(key, JSON.stringify(value), Date.now());
  }
}

