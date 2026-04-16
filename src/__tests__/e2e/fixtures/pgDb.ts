import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) throw new Error("DATABASE_URL no definido.");
    pool = new Pool({ connectionString });
  }
  return pool;
}

function req(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Falta ${name} en .env.test (o entorno)`);
  return v;
}

/** Crea o actualiza usuarios de test (user + operator). Sin Prisma — compatible con workers de Playwright. */
export async function ensureTestUsers() {
  const p = getPool();
  const userEmail = req("TEST_USER_EMAIL").toLowerCase();
  const userPass = req("TEST_USER_PASSWORD");
  const opEmail = req("TEST_OPERATOR_EMAIL").toLowerCase();
  const opPass = req("TEST_OPERATOR_PASSWORD");

  const userHash = await bcrypt.hash(userPass, await bcrypt.genSalt(10));
  const opHash = await bcrypt.hash(opPass, await bcrypt.genSalt(10));

  const upsert = async (email: string, hash: string, role: "user" | "operator") => {
    const id = randomUUID();
    await p.query(
      `INSERT INTO "User" (id, email, "passwordHash", role)
       VALUES ($1, $2, $3, $4::"UserRole")
       ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role`,
      [id, email, hash, role]
    );
  };

  await upsert(userEmail, userHash, "user");
  await upsert(opEmail, opHash, "operator");
}

export async function getTestUserId(): Promise<string> {
  const p = getPool();
  const email = req("TEST_USER_EMAIL").toLowerCase();
  const r = await p.query<{ id: string }>(`SELECT id FROM "User" WHERE email = $1 LIMIT 1`, [email]);
  const id = r.rows[0]?.id;
  if (!id) throw new Error(`No existe usuario de test con email ${email}. Corré ensureTestUsers.`);
  return id;
}

export type CreateQuotedQuoteOpts = {
  productTitle?: string;
};

export async function createQuotedQuoteWithoutOperation(userId: string, opts?: CreateQuotedQuoteOpts) {
  const p = getPool();
  const id = randomUUID();
  const anonId = `e2e_${randomUUID()}`;
  const title = opts?.productTitle ?? "Producto E2E test";
  const quoteJson = {
    cards: [{ label: "Total puesto en Argentina", value: "$1.000 – $2.000", highlight: true }],
    breakdown: {},
  };
  const productJson = { title };
  await p.query(
    `INSERT INTO "Quote" (id, "anonId", mode, "userText", "quoteJson", "productJson", stage, "userId", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, NOW())`,
    [
      id,
      anonId,
      "quote",
      `Producto E2E para importación — ${title}`,
      JSON.stringify(quoteJson),
      JSON.stringify(productJson),
      "quoted",
      userId,
    ]
  );
  return { id };
}

export async function deleteQuoteCascade(quoteId: string) {
  const p = getPool();
  await p.query(`DELETE FROM "Quote" WHERE id = $1`, [quoteId]);
}

export async function deleteNotificationsForUser(userId: string) {
  const p = getPool();
  await p.query(`DELETE FROM "Notification" WHERE "userId" = $1`, [userId]);
}
