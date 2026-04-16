import { expect, test } from "@playwright/test";
import { STORAGE_USER } from "./fixtures/storagePaths";

const MOCK_CHAT_BODY = {
  assistantMessage:
    "Clasificación lista: posición **8471.50.00** (auriculares). NCM 84715000.",
  snapshot: {
    status: "resolved" as const,
    recommendedNcm: "84715000",
    confidence: 0.91,
    classificationRationale: "Respuesta mock E2E.",
    productName: "Auriculares",
  },
};

test.describe("clasificador NCM", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/clasificar-ncm/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CHAT_BODY),
      });
    });
  });

  test("debería cargar /clasificarncm sin sesión", async ({ page }) => {
    await page.goto("/clasificarncm");
    await expect(page.getByText(/Clasificación NCM/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("debería aceptar mensaje y mostrar respuesta del asistente", async ({ page }) => {
    await page.goto("/clasificarncm");
    await page.getByPlaceholder(/Describí el producto/i).fill("Auriculares bluetooth");
    await page.getByRole("button", { name: /Enviar/i }).click();
    await expect(page.getByText(/84715000|8471\.50\.00/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("debería mostrar Cotizar este producto tras clasificar", async ({ page }) => {
    await page.goto("/clasificarncm");
    await page.getByPlaceholder(/Describí el producto/i).fill("Producto de prueba E2E");
    await page.getByRole("button", { name: /Enviar/i }).click();
    await expect(page.getByRole("link", { name: /Cotizar este producto/i })).toBeVisible({ timeout: 15_000 });
  });

  test("debería llevar el CTA a login con redirect si no hay sesión", async ({ page }) => {
    await page.goto("/clasificarncm");
    await page.getByPlaceholder(/Describí el producto/i).fill("Test sin sesión");
    await page.getByRole("button", { name: /Enviar/i }).click();
    const link = page.getByRole("link", { name: /Cotizar este producto/i });
    await expect(link).toBeVisible({ timeout: 15_000 });
    await expect(link).toHaveAttribute("href", /\/login\?redirect=/);
  });
});

test.describe("clasificador NCM con sesión", () => {
  test.use({ storageState: STORAGE_USER });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/clasificar-ncm/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CHAT_BODY),
      });
    });
  });

  test("debería llevar el CTA a /app/nueva con ncm= si hay sesión", async ({ page }) => {
    await page.goto("/clasificarncm");
    await page.getByPlaceholder(/Describí el producto/i).fill("Con sesión");
    await page.getByRole("button", { name: /Enviar/i }).click();
    const link = page.getByRole("link", { name: /Cotizar este producto/i });
    await expect(link).toBeVisible({ timeout: 15_000 });
    await expect(link).toHaveAttribute("href", /\/app\/nueva\?.*ncm=84715000/);
  });
});
