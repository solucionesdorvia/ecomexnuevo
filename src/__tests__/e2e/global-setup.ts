import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "src/__tests__/e2e/.env.test") });

/**
 * Asegura usuarios de test en la DB (corre bajo `tsx` para compatibilidad ESM con Prisma).
 */
export default function globalSetup() {
  const script = path.resolve(__dirname, "scripts/ensure-users.ts");
  execFileSync("npx", ["tsx", script], {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
}
