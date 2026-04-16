import { expect, test } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";
import { STORAGE_USER } from "./fixtures/storagePaths";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "src/__tests__/e2e/.env.test") });

test.describe("seguridad API y redirects", () => {
  test("debería responder 401 a GET /api/app/operations sin sesión", async ({ request }) => {
    const res = await request.get("/api/app/operations");
    expect(res.status()).toBe(401);
  });

  test("debería responder 401 a POST /api/app/suppliers sin sesión", async ({ request }) => {
    const res = await request.post("/api/app/suppliers", {
      data: { name: "X", country: "AR" },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("seguridad con usuario logueado", () => {
  test.use({ storageState: STORAGE_USER });

  test("debería responder 403 si un usuario intenta PATCH de etapa de operación", async ({ request }) => {
    const res = await request.patch("/api/app/operations/op_inexistente_e2e/stage", {
      data: { stage: "ORDEN_COMPRA" },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(403);
  });

  test("no debería redirigir tras login a open-redirect tipo //evil.com", async ({ page }) => {
    await page.goto(`/login?redirect=${encodeURIComponent("//evil.com")}`);
    const email = process.env.TEST_USER_EMAIL?.trim() ?? "";
    const password = process.env.TEST_USER_PASSWORD?.trim() ?? "";
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Contraseña").fill(password);
    await page.getByRole("button", { name: /Entrar/ }).click();
    await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 20_000 });
    expect(page.url()).not.toMatch(/evil\.com/);
  });
});
