import { expect, test } from "@playwright/test";
import { STORAGE_USER } from "./fixtures/storagePaths";

test.use({ storageState: STORAGE_USER });

const MOCK_CHAT = {
  assistantMessage: "NCM **84715000** listo para cotizar.",
  snapshot: {
    status: "resolved" as const,
    recommendedNcm: "84715000",
    confidence: 0.88,
    classificationRationale: "Mock E2E.",
    productName: "Auriculares",
  },
};

const MOCK_QUOTE = {
  ok: true,
  quoteId: "e2e_quote_mock_id",
  cards: [
    { label: "FOB estimado", value: "USD 50 – 80" },
    { label: "Total puesto en Argentina", value: "USD 500 – 700", highlight: true },
  ],
  totalMinUsd: 500,
  totalMaxUsd: 700,
  explanation: "Cotización **mock** para pruebas E2E.",
  assumptions: [{ id: "a1", label: "Arancel", value: "12%", tone: "muted" as const }],
  quality: 82,
};

test.describe("nueva cotización /app/nueva", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/clasificar-ncm/chat", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CHAT),
      });
    });
    await page.route("**/api/app/nueva/quote-from-classifier", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUOTE),
      });
    });
  });

  test("debería cargar /app/nueva correctamente", async ({ page }) => {
    await page.goto("/app/nueva");
    await expect(page.getByRole("heading", { name: /Analista técnico NCM/i })).toBeVisible({ timeout: 20_000 });
  });

  test("debería mostrar banner NCM precargado con query ncm y producto", async ({ page }) => {
    await page.goto("/app/nueva?ncm=84715000&producto=auriculares");
    await expect(page.getByText(/NCM precargado:\s*84715000/i)).toBeVisible({ timeout: 20_000 });
  });

  test("debería enviar mensaje al chat y mostrar presupuesto mock", async ({ page }) => {
    await page.goto("/app/nueva?ncm=84715000&producto=auriculares");
    const input = page.getByPlaceholder(/Describí el producto/i);
    await input.fill("Confirmar cotización E2E");
    await page.getByRole("button", { name: /Enviar/i }).click();
    await expect(page.getByRole("button", { name: /Crear presupuesto con este NCM/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: /Crear presupuesto con este NCM/i }).click();
    await expect(page.getByRole("heading", { name: /Costos estimados de importación/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /Ver operaciones/i })).toBeVisible();
  });
});
