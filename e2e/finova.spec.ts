import { expect, test, type Page } from "@playwright/test";

async function signUp(page: Page) {
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.dev`;
  await page.goto("/register");
  await page.getByPlaceholder("Name").fill("E2E User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder(/Password/).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/dashboard/);
  return email;
}

test("unauthenticated users are redirected to login", async ({ page }) => {
  await page.goto("/investments");
  await expect(page).toHaveURL(/login/);
});

test("transactions update budgets", async ({ page }) => {
  await signUp(page);
  await page.goto("/budgets");
  await page.getByPlaceholder(/Category/).fill("Food");
  await page.getByPlaceholder("Monthly limit").fill("200");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("budget-Food")).toContainText("$200.00");

  await page.goto("/transactions");
  await page.getByPlaceholder("Category", { exact: true }).fill("Food");
  await page.getByPlaceholder("Amount").fill("50");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId("tx-table")).toContainText("-$50.00");

  await page.goto("/budgets");
  await expect(page.getByTestId("budget-Food")).toContainText("$150.00");
});

test("portfolio computes realized and unrealized P&L", async ({ page }) => {
  await signUp(page);
  await page.goto("/investments");
  await page.getByPlaceholder("Symbol").fill("TEST");
  await page.getByPlaceholder("Name").fill("Test Corp");
  await page.getByPlaceholder("Current price").fill("100");
  await page.getByRole("button", { name: "Add asset" }).click();
  await expect(page.getByRole("cell", { name: /TEST/ })).toBeVisible();

  const trade = async (side: string, qty: string, price: string) => {
    await page.getByLabel("Side").selectOption(side);
    await page.getByPlaceholder("Quantity").fill(qty);
    await page.getByPlaceholder("Price", { exact: true }).fill(price);
    await page.getByRole("button", { name: "Record" }).click();
  };
  await trade("BUY", "10", "80");
  await expect(page.getByTestId("unrealized")).toHaveText("$200.00");
  await trade("SELL", "4", "120");
  await expect(page.getByTestId("realized")).toHaveText("$160.00");
  await expect(page.getByTestId("market-value")).toHaveText("$600.00");

  await trade("SELL", "100", "120");
  await expect(page.locator("p.error")).toHaveText("Cannot sell more than held");

  await page.goto("/insights");
  await expect(page.getByTestId("health-score")).toBeVisible();
  await expect(page.getByText("TEST is 100% of your portfolio")).toBeVisible();
});

test("users cannot see each other's data", async ({ browser }) => {
  const a = await browser.newPage();
  await signUp(a);
  await a.goto("/net-worth");
  await a.getByPlaceholder("Account name").fill("Secret Vault");
  await a.getByPlaceholder("Balance").fill("1000");
  await a.getByRole("button", { name: "Add account" }).click();
  await expect(a.getByTestId("nw-total")).toHaveText("$1,000.00");

  const b = await (await browser.newContext()).newPage();
  await signUp(b);
  await b.goto("/net-worth");
  await expect(b.getByTestId("nw-total")).toHaveText("$0.00");
  await expect(b.getByText("Secret Vault")).toHaveCount(0);
});
