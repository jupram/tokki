import { expect, test } from "@playwright/test";

test("tokki loads and changes action over time", async ({ page }) => {
  await page.goto("/");

  const action = page.getByTestId("tokki-action");
  await expect(action).toBeVisible();

  const initial = await action.textContent();

  await expect
    .poll(async () => action.textContent(), { timeout: 8_000 })
    .not.toBe(initial);
});

test("tokki reacts to poke interaction", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Poke Tokki" }).click();

  await expect(page.getByTestId("tokki-action")).toHaveText("react_poke");
  await expect(page.getByTestId("tokki-mood")).toHaveText("surprised");
});
