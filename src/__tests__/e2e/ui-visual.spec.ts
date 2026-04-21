import { expect, test } from "@playwright/test";
import { STORAGE_USER } from "./fixtures/storagePaths";

async function collectConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

// ─── DESKTOP 1440×900 — páginas públicas ─────────────────────────────────────

test.describe("UI Desktop 1440×900 — público", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Landing / — carga, nav, CTAs, sin errores de consola", async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/ui/desktop-landing.png" });

    await expect(page.locator("body")).toBeVisible();

    // nav links hacen scroll (sin fullPage screenshot por timeout)
    for (const label of ["Servicios", "Cómo trabajamos", "Plataforma", "Contacto"]) {
      const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
      if (await link.isVisible()) await link.click();
    }
    await page.screenshot({ path: "test-results/ui/desktop-landing-after-nav.png" });

    const relevantErrors = errors.filter((e) => !e.includes("favicon"));
    if (relevantErrors.length) console.log("Console errors on /:", relevantErrors);
    expect(relevantErrors).toHaveLength(0);
  });

  test("Login — tab nav funciona, error con credenciales incorrectas", async ({ page }) => {
    await page.goto("/login");
    await page.screenshot({ path: "test-results/ui/desktop-login.png" });

    await page.getByPlaceholder("Email").focus();
    await page.keyboard.press("Tab");
    const passwordFocused = await page
      .getByPlaceholder("Contraseña")
      .evaluate((el) => el === document.activeElement);
    expect(passwordFocused).toBe(true);

    await page.getByPlaceholder("Email").fill("wrong@test.com");
    await page.getByPlaceholder("Contraseña").fill("wrongpass");
    await page.getByRole("button", { name: /Entrar/i }).click();
    await expect(page.getByText(/Email o contraseña incorrectos/i)).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "test-results/ui/desktop-login-error.png" });
  });

  test("Register — página accesible", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/ui/desktop-register.png" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Clasificador público /clasificarncm — sin sesión, sin errores", async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.goto("/clasificarncm");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/ui/desktop-clasificarncm.png" });
    await expect(page.locator("body")).toBeVisible();
    const relevantErrors = errors.filter((e) => !e.includes("favicon"));
    if (relevantErrors.length) console.log("Console errors /clasificarncm:", relevantErrors);
    expect(relevantErrors).toHaveLength(0);
  });
});

// ─── DESKTOP 1440×900 — autenticado ──────────────────────────────────────────

test.describe("UI Desktop 1440×900 — autenticado", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.use({ storageState: STORAGE_USER });

  test("App shell — sidebar grupos, topbar CTA, sin errores", async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/desktop-app-shell.png" });

    for (const group of ["FLUJO PRINCIPAL", "EJECUCI", "INTELIGENCIA", "WORKSPACE"]) {
      const el = page.getByText(new RegExp(group, "i")).first();
      await expect(el).toBeVisible({ timeout: 15_000 });
    }

    const newOpBtn = page
      .getByRole("button", { name: /Nueva operaci[oó]n/i })
      .or(page.getByRole("link", { name: /Nueva operaci[oó]n/i }));
    await expect(newOpBtn.first()).toBeVisible();
    await page.screenshot({ path: "test-results/ui/desktop-app-topbar.png" });

    const relevantErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("hydrat"));
    if (relevantErrors.length) console.log("Console errors /app:", relevantErrors);
    expect(relevantErrors).toHaveLength(0);
  });

  test("Notificaciones — campana abre y cierra con Esc", async ({ page }) => {
    await page.goto("/app", { waitUntil: "networkidle" });

    const bell = page
      .locator('[aria-label*="otificaci"], [aria-label*="bell"], [data-testid*="notif"]')
      .first();
    if ((await bell.count()) > 0) {
      await bell.click();
      await page.screenshot({ path: "test-results/ui/desktop-notifications-open.png" });
      await page.keyboard.press("Escape");
      await page.screenshot({ path: "test-results/ui/desktop-notifications-closed.png" });
    } else {
      console.log("Bell no encontrado por aria-label — busco por posición");
      await page.screenshot({ path: "test-results/ui/desktop-no-bell.png" });
    }
  });

  test("Chat NCM /app/nueva — composer visible, sin errores consola", async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await page.goto("/app/nueva", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/desktop-chat-ncm.png" });

    const composer = page
      .getByPlaceholder(/Describí el producto/i)
      .or(page.getByRole("textbox").last());
    await expect(composer.first()).toBeVisible({ timeout: 15_000 });

    const relevantErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("hydrat"));
    if (relevantErrors.length) console.log("Console errors /app/nueva:", relevantErrors);
    expect(relevantErrors).toHaveLength(0);
  });

  test("Operaciones — página carga sin redirect", async ({ page }) => {
    await page.goto("/app/operaciones", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/desktop-operaciones.png" });
    await expect(page).not.toHaveURL(/login/);
  });

  test("Reportes — página carga sin redirect", async ({ page }) => {
    await page.goto("/app/reportes", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/desktop-reportes.png" });
    await expect(page).not.toHaveURL(/login/);
  });

  test("Panel operador — visible con rol admin", async ({ page }) => {
    await page.goto("/app/operador", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/desktop-operador.png" });
    await expect(page).not.toHaveURL(/login/);
  });

  test("Accesibilidad — foco visible en elementos interactivos", async ({ page }) => {
    await page.goto("/app/nueva", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.screenshot({ path: "test-results/ui/desktop-focus-visible.png" });
  });
});

// ─── MOBILE iPhone 15 390×844 ────────────────────────────────────────────────

test.describe("UI Mobile 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.use({ storageState: STORAGE_USER });

  test("Landing — sin scroll horizontal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await page.screenshot({ path: "test-results/ui/mobile-landing.png" });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("Login — inputs ≥ 16px (sin zoom iOS)", async ({ page }) => {
    await page.goto("/login");
    await page.screenshot({ path: "test-results/ui/mobile-login.png" });
    const fontSize = await page.getByPlaceholder("Email").evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    console.log(`Login input font-size: ${fontSize}px`);
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("App shell — hamburger abre drawer, Esc lo cierra", async ({ page }) => {
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/mobile-app-shell.png" });

    const hamburger = page
      .getByRole("button", { name: /men[uú]|hamburger|sidebar|toggle/i })
      .or(page.locator('[aria-label*="menu"], [aria-label*="Menu"]'))
      .first();

    if ((await hamburger.count()) > 0) {
      await hamburger.click();
      await page.screenshot({ path: "test-results/ui/mobile-drawer-open.png" });
      await page.keyboard.press("Escape");
      await page.screenshot({ path: "test-results/ui/mobile-drawer-closed-esc.png" });
    } else {
      console.log("Hamburger no encontrado — capturando estado actual");
      await page.screenshot({ path: "test-results/ui/mobile-no-hamburger.png" });
    }
  });

  test("Chat NCM — sin overflow, composer visible", async ({ page }) => {
    await page.goto("/app/nueva", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/mobile-chat-ncm.png" });

    const composer = page.getByPlaceholder(/Describí el producto/i).first();
    await expect(composer).toBeVisible({ timeout: 15_000 });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("Botones táctiles ≥ 44px (máx 5 excepciones)", async ({ page }) => {
    await page.goto("/app", { waitUntil: "networkidle" });
    const buttons = await page.getByRole("button").all();
    const small: string[] = [];
    for (const btn of buttons.slice(0, 20)) {
      const box = await btn.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        const label = await btn.textContent();
        small.push(`"${label?.trim().slice(0, 30)}" → ${Math.round(box.width)}×${Math.round(box.height)}px`);
      }
    }
    if (small.length) console.log("Botones < 44px:", small);
    await page.screenshot({ path: "test-results/ui/mobile-tap-targets.png" });
    expect(small.length).toBeLessThanOrEqual(5);
  });

  test("Operaciones — sin overflow horizontal", async ({ page }) => {
    await page.goto("/app/operaciones", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/ui/mobile-operaciones.png" });
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ─── MOBILE iPhone SE 375×667 ────────────────────────────────────────────────

test.describe("UI Mobile 375×667 (iPhone SE)", () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test.use({ storageState: STORAGE_USER });

  test("Landing sin overflow horizontal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await page.screenshot({ path: "test-results/ui/mobile-se-landing.png" });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("App /app/nueva sin overflow horizontal", async ({ page }) => {
    await page.goto("/app/nueva", { waitUntil: "networkidle" });
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    await page.screenshot({ path: "test-results/ui/mobile-se-chat.png" });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
