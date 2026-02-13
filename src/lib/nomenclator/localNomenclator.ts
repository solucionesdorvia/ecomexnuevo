import Database from "better-sqlite3";

export type LocalNcmRow = {
  ncmCode: string; // XXXX.XX.XX
  title?: string;
  breadcrumbs?: string[];
  updatedAt: number; // epoch ms
};

function normText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fmtNcm(ncmRaw: string) {
  const digits = (ncmRaw || "").replace(/\D/g, "");
  if (digits.length < 6) return "9999.99.99";
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 6);
  const c = digits.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

export class LocalNomenclator {
  private db: Database.Database;

  constructor(opts?: { path?: string }) {
    const p = opts?.path ?? process.env.NOMENCLATOR_DB_PATH ?? "nomenclator.db";
    this.db = new Database(p);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ncm (
        ncm_code TEXT PRIMARY KEY,
        title TEXT,
        breadcrumbs_json TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS ncm_fts USING fts5(
        ncm_code,
        title,
        breadcrumbs,
        content='ncm',
        content_rowid='rowid'
      );
      CREATE TRIGGER IF NOT EXISTS ncm_ai AFTER INSERT ON ncm BEGIN
        INSERT INTO ncm_fts(rowid, ncm_code, title, breadcrumbs)
        VALUES (new.rowid, new.ncm_code, new.title, new.breadcrumbs_json);
      END;
      CREATE TRIGGER IF NOT EXISTS ncm_ad AFTER DELETE ON ncm BEGIN
        INSERT INTO ncm_fts(ncm_fts, rowid, ncm_code, title, breadcrumbs)
        VALUES('delete', old.rowid, old.ncm_code, old.title, old.breadcrumbs_json);
      END;
      CREATE TRIGGER IF NOT EXISTS ncm_au AFTER UPDATE ON ncm BEGIN
        INSERT INTO ncm_fts(ncm_fts, rowid, ncm_code, title, breadcrumbs)
        VALUES('delete', old.rowid, old.ncm_code, old.title, old.breadcrumbs_json);
        INSERT INTO ncm_fts(rowid, ncm_code, title, breadcrumbs)
        VALUES (new.rowid, new.ncm_code, new.title, new.breadcrumbs_json);
      END;
    `);
  }

  upsert(rows: Array<{ ncmCode: string; title?: string; breadcrumbs?: string[] }>) {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ncm (ncm_code, title, breadcrumbs_json, updated_at)
       VALUES (@ncm_code, @title, @breadcrumbs_json, @updated_at)`
    );
    const tx = this.db.transaction((items: any[]) => {
      for (const it of items) stmt.run(it);
    });
    const now = Date.now();
    tx(
      rows
        .map((r) => ({
          ncm_code: fmtNcm(r.ncmCode),
          title: r.title ? String(r.title).trim() : null,
          breadcrumbs_json: r.breadcrumbs?.length ? JSON.stringify(r.breadcrumbs) : null,
          updated_at: now,
        }))
        .filter((r) => r.ncm_code !== "9999.99.99")
    );
  }

  search(query: string, opts?: { limit?: number; hsHeading?: string }) {
    const q = normText(query);
    if (!q) return [] as LocalNcmRow[];
    const limit = Math.min(50, Math.max(5, opts?.limit ?? 12));
    const hs = String(opts?.hsHeading ?? "").replace(/\D/g, "");

    // FTS5 query: split into tokens with prefix matching.
    const toks = q.split(/\s+/g).filter((t) => t.length >= 3).slice(0, 10);
    const ftsQuery = toks.map((t) => `${t}*`).join(" ");

    const rows = this.db
      .prepare(
        `SELECT ncm_code as ncmCode, title, breadcrumbs_json as breadcrumbsJson, updated_at as updatedAt
         FROM ncm
         WHERE rowid IN (SELECT rowid FROM ncm_fts WHERE ncm_fts MATCH ?)
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(ftsQuery, limit) as Array<{
      ncmCode: string;
      title: string | null;
      breadcrumbsJson: string | null;
      updatedAt: number;
    }>;

    const parsed = rows.map((r) => ({
      ncmCode: r.ncmCode,
      title: r.title ?? undefined,
      breadcrumbs: r.breadcrumbsJson ? (JSON.parse(r.breadcrumbsJson) as string[]) : undefined,
      updatedAt: r.updatedAt,
    }));

    if (hs && hs.length === 4) {
      return parsed.filter((r) => r.ncmCode.replace(/\D/g, "").startsWith(hs));
    }
    return parsed;
  }
}

