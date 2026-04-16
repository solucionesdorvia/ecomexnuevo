import path from "path";

export const PLAYWRIGHT_DIR = path.join(process.cwd(), ".playwright");
export const STORAGE_USER = path.join(PLAYWRIGHT_DIR, "user.json");
export const STORAGE_OPERATOR = path.join(PLAYWRIGHT_DIR, "operator.json");
