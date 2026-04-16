import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createQuotedQuoteWithoutOperation } from "./fixtures/createTestQuote";
import { getTestUserId } from "./fixtures/createTestUser";
import { deleteQuoteCascade, deleteNotificationsForUser } from "./fixtures/cleanup";
import { STORAGE_USER } from "./fixtures/storagePaths";

test.use({ storageState: STORAGE_USER });

test.describe("operación desde cotización quoted", () => {
  let quoteId: string;
  let operationId: string;
  const productTitle = `E2E op ${randomUUID()}`;

  test.beforeEach(async ({ page }) => {
    const userId = await getTestUserId();
    const q = await createQuotedQuoteWithoutOperation(userId, { productTitle });
    quoteId = q.id;

    const res = await page.request.post("/api/app/operations", {
      data: { quoteId },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as { operationId?: string };
    expect(json.operationId).toBeTruthy();
    operationId = json.operationId!;
  });

  test.afterEach(async () => {
    await deleteQuoteCascade(quoteId);
    const userId = await getTestUserId();
    await deleteNotificationsForUser(userId);
  });

  test("debería responder 200 al crear operación con quoteId válido", async () => {
    expect(operationId.length).toBeGreaterThan(4);
  });

  test("debería cargar la vista de importación con pipeline y timeline", async ({ page }) => {
    await page.goto(`/app/operaciones/${operationId}/operation`);
    await expect(page.getByText(/Etapa actual/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Iniciada/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Timeline/i })).toBeVisible();
    await expect(page.getByText(/Importación iniciada/i)).toBeVisible();
  });

  test("debería agregar documento por URL y listarlo", async ({ page }) => {
    await page.goto(`/app/operaciones/${operationId}/operation`);
    await page.getByRole("button", { name: /Subir documento/i }).click();
    await page.getByRole("button", { name: /Agregar por URL/i }).click();
    await page.getByPlaceholder(/Nombre del archivo/i).fill("Doc E2E");
    await page.locator('input[placeholder*="https"]').fill("https://example.com/e2e-doc.pdf");
    await page.getByRole("button", { name: /^Guardar$/i }).click();
    await expect(page.getByRole("link", { name: /Doc E2E/i })).toBeVisible({ timeout: 20_000 });
  });
});
