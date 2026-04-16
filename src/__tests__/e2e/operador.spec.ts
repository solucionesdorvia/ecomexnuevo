import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createQuotedQuoteWithoutOperation } from "./fixtures/createTestQuote";
import { getTestUserId } from "./fixtures/createTestUser";
import { deleteQuoteCascade, deleteNotificationsForUser } from "./fixtures/cleanup";
import { STORAGE_OPERATOR, STORAGE_USER } from "./fixtures/storagePaths";

test.describe("panel operador", () => {
  test.describe.configure({ mode: "serial" });

  test.use({
    storageState: STORAGE_OPERATOR,
    viewport: { width: 1280, height: 800 },
  });

  let quoteId: string;
  let operationId: string;
  const productTitle = `E2E operador ${randomUUID()}`;

  test.beforeEach(async ({ browser }) => {
    const userId = await getTestUserId();
    const q = await createQuotedQuoteWithoutOperation(userId, { productTitle });
    quoteId = q.id;

    const userCtx = await browser.newContext({ storageState: STORAGE_USER });
    const res = await userCtx.request.post("/api/app/operations", {
      data: { quoteId },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as { operationId?: string };
    operationId = json.operationId!;
    await userCtx.close();
  });

  test.afterEach(async () => {
    await deleteQuoteCascade(quoteId);
    const userId = await getTestUserId();
    await deleteNotificationsForUser(userId);
  });

  test("debería cargar /app/operador con las dos pestañas", async ({ page }) => {
    await page.goto("/app/operador");
    await expect(page.getByRole("button", { name: /^Presupuestos$/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Importaciones activas/i })).toBeVisible();
  });

  test("debería listar importaciones en la pestaña activas", async ({ page }) => {
    await page.goto("/app/operador");
    await page.getByRole("button", { name: /Importaciones activas/i }).click();
    await expect(page.locator("tbody").getByText(productTitle, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test("debería avanzar etapa y registrar evento", async ({ page }) => {
    await page.goto("/app/operador");
    await page.getByRole("button", { name: /Importaciones activas/i }).click();
    await expect(page.locator("tbody").getByText(productTitle, { exact: false })).toBeVisible({ timeout: 20_000 });

    const productRow = page.locator("tbody tr").filter({ hasText: productTitle }).first();
    await productRow.getByRole("button", { name: /Avanzar etapa/i }).click();
    await page.locator("tbody tr").filter({ has: page.locator("select") }).locator("select").first()
      .selectOption({ label: "Orden de compra" });
    await page.getByRole("button", { name: /^Confirmar$/i }).click();

    await expect(
      page.locator("tbody tr").filter({ hasText: productTitle }).getByText(/Orden de compra/i).first()
    ).toBeVisible({ timeout: 20_000 });

    const rowAfter = page.locator("tbody tr").filter({ hasText: productTitle }).first();
    await rowAfter.getByRole("button", { name: /Agregar evento/i }).click();
    const eventNote = `Nota E2E operador ${Date.now()}`;
    const eventPost = page.waitForResponse(
      (r) => r.url().includes("/events") && r.request().method() === "POST" && r.status() === 200
    );
    await page.locator("tbody textarea").last().fill(eventNote);
    await page.getByRole("button", { name: /Registrar evento/i }).click();
    await eventPost;
    await page.goto(`/app/operaciones/${operationId}/operation`);
    await expect(page.getByText(eventNote)).toBeVisible({ timeout: 20_000 });
  });

  test("debería notificar al usuario en la campana tras cambio de etapa", async ({ browser }) => {
    test.setTimeout(60_000);

    const opCtx = await browser.newContext({
      storageState: STORAGE_OPERATOR,
      viewport: { width: 1280, height: 800 },
    });
    const opPage = await opCtx.newPage();
    await opPage.goto("/app/operador");
    await opPage.getByRole("button", { name: /Importaciones activas/i }).click();
    await expect(opPage.locator("tbody").getByText(productTitle, { exact: false })).toBeVisible({ timeout: 20_000 });
    const productRow = opPage.locator("tbody tr").filter({ hasText: productTitle }).first();
    await productRow.getByRole("button", { name: /Avanzar etapa/i }).click();
    await opPage.locator("tbody tr").filter({ has: opPage.locator("select") }).locator("select").first()
      .selectOption({ label: "Orden de compra" });
    const patchDone = opPage.waitForResponse(
      (r) => r.url().includes("/stage") && r.request().method() === "PATCH" && r.status() === 200
    );
    await opPage.getByRole("button", { name: /^Confirmar$/i }).click();
    await patchDone;
    await opCtx.close();

    const userCtx = await browser.newContext({
      storageState: STORAGE_USER,
      viewport: { width: 1280, height: 800 },
    });
    const apiCheck = await userCtx.request.get("/api/app/notifications");
    expect(apiCheck.status()).toBe(200);
    const apiJson = (await apiCheck.json()) as { unreadCount?: number };
    expect(apiJson.unreadCount ?? 0).toBeGreaterThan(0);

    const userPage = await userCtx.newPage();
    const notifFetch = userPage.waitForResponse(
      (r) => r.url().includes("/api/app/notifications") && r.ok()
    );
    await userPage.goto("/app");
    await notifFetch;
    await expect(userPage.getByTestId("notifications-unread-badge")).toBeVisible({ timeout: 15_000 });
    await userCtx.close();
  });
});
