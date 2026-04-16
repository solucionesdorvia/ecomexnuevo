import { mkdirSync } from "fs";
import path from "path";
import { test as setup } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

const userEmail = process.env.TEST_USER_EMAIL?.trim();
const userPassword = process.env.TEST_USER_PASSWORD?.trim();
const operatorEmail = process.env.TEST_OPERATOR_EMAIL?.trim();
const operatorPassword = process.env.TEST_OPERATOR_PASSWORD?.trim();

const outDir = path.join(process.cwd(), ".playwright");
const userFile = path.join(outDir, "user.json");
const operatorFile = path.join(outDir, "operator.json");

function requireEnv() {
  if (!userEmail || !userPassword || !operatorEmail || !operatorPassword) {
    throw new Error("Definí TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_OPERATOR_EMAIL, TEST_OPERATOR_PASSWORD en .env.test");
  }
}

setup.beforeAll(() => {
  requireEnv();
  mkdirSync(outDir, { recursive: true });
});

setup("guardar sesión de usuario", async ({ browser }) => {
  requireEnv();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(userEmail!);
  await page.getByPlaceholder("Contraseña").fill(userPassword!);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 20_000 });
  await context.storageState({ path: userFile });
  await context.close();
});

setup("guardar sesión de operador", async ({ browser }) => {
  requireEnv();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(operatorEmail!);
  await page.getByPlaceholder("Contraseña").fill(operatorPassword!);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 20_000 });
  await context.storageState({ path: operatorFile });
  await context.close();
});
