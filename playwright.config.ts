import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
