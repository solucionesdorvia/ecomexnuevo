import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "src/__tests__/e2e/.env.test") });

export default defineConfig({
  testDir: "src/__tests__/e2e",
  testMatch: /ui-visual\.spec\.ts/,
  fullyParallel: false,
  retries: 1,
  timeout: 40_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "https://ecomexnuevo-production.up.railway.app",
    trace: "off",
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "setup",
      testMatch: /setup\/auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /ui-visual\.spec\.ts/,
    },
  ],
});
