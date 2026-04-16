import dotenv from "dotenv";
import path from "path";
import { ensureTestUsers } from "../fixtures/pgDb";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "src/__tests__/e2e/.env.test") });

void ensureTestUsers().then(
  () => {
    process.exit(0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
