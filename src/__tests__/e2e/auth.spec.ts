import { expect, test } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "src/__tests__/e2e/.env.test") });

const userEmail = process.env.TEST_USER_EMAIL?.trim() ?? "";
const userPassword = process.env.TEST_USER_PASSWORD?.trim() ?? "";

test.describe("autenticación", () => {
  test("debería redirigir a /app tras login con credenciales válidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(userEmail);
    await page.getByPlaceholder("Contraseña").fill(userPassword);
    await page.getByRole("button", { name: /Entrar/ }).click();
    await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 20_000 });
  });

  test("debería mostrar error con contraseña incorrecta", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(userEmail);
    await page.getByPlaceholder("Contraseña").fill("___wrong_password_e2e___");
    await page.getByRole("button", { name: /Entrar/ }).click();
    await expect(page.getByText(/Email o contraseña incorrectos/i)).toBeVisible({ timeout: 15_000 });
  });

  test("debería mostrar error con email inexistente", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("no-existe-e2e@test.invalid");
    await page.getByPlaceholder("Contraseña").fill("cualquiercosa123");
    await page.getByRole("button", { name: /Entrar/ }).click();
    await expect(page.getByText(/Email o contraseña incorrectos/i)).toBeVisible({ timeout: 15_000 });
  });

  test("debería redirigir a login al visitar /app sin sesión", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("debería redirigir a login al visitar /app/operaciones sin sesión", async ({ page }) => {
    await page.goto("/app/operaciones");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
