import { expect, test, type Page } from "@playwright/test";

const ONBOARDING_PROFILE_KEY = "tokki_onboarding_profile";

/**
 * Seed localStorage with a completed onboarding profile so tests bypass
 * the OnboardingWizard and land directly on the TokkiCharacter UI.
 */
async function seedOnboardingProfile(page: Page): Promise<void> {
  await page.addInitScript(({ key }) => {
    const profile = {
      version: 1,
      avatarId: "fox_v2",
      personality: {
        name: "Ember",
        preset: "clever",
        humor: 70,
        reaction_intensity: 65,
        chattiness: 55,
      },
      completedAt: "2026-01-01T00:00:00.000Z",
    };

    window.localStorage.setItem(key, JSON.stringify(profile));
    window.localStorage.setItem("tokki_onboarded", "1");
    window.localStorage.setItem("tokki_avatar_id", profile.avatarId);
    window.localStorage.setItem("tokki_pet_name", profile.personality.name);
  }, { key: ONBOARDING_PROFILE_KEY });
}

/** Navigate to the app and wait for the avatar to be visible. */
async function gotoApp(page: Page): Promise<void> {
  await seedOnboardingProfile(page);
  await page.goto("/");
  await expect(page.getByTestId("tokki-avatar")).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

// ---------------------------------------------------------------------------
// Quick-pass tests (context menu, avatar picker)
// ---------------------------------------------------------------------------

test("context menu opens on right-click and links to settings", async ({ page }) => {
  await gotoApp(page);

  const avatar = page.getByTestId("tokki-avatar");
  await avatar.click({ button: "right" });

  const contextMenu = page.getByTestId("context-menu");
  await expect(contextMenu).toBeVisible({ timeout: 5_000 });

  const viewport = page.viewportSize();
  const box = await contextMenu.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.y).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width - 8);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height - 8);

  await expect(page.getByTestId("context-menu-settings")).toBeVisible();
  await expect(page.getByTestId("context-menu-chat")).toBeVisible();

  await page.getByTestId("context-menu-settings").click();

  const settingsPanel = page.getByTestId("settings-panel");
  await expect(settingsPanel).toBeVisible({ timeout: 5_000 });

  await page.getByTestId("settings-close").click();
  await expect(settingsPanel).not.toBeVisible({ timeout: 3_000 });
});

test("avatar picker changes the active avatar", async ({ page }) => {
  await gotoApp(page);

  const avatar = page.getByTestId("tokki-avatar");
  await avatar.click();

  const chatPanel = page.getByTestId("chat-panel");
  await expect(chatPanel).toBeVisible({ timeout: 5_000 });

  const avatarPicker = page.getByTestId("avatar-picker");
  await expect(avatarPicker).toBeVisible();

  const catButton = page.getByTestId("avatar-cat_v1");
  await catButton.click();

  await expect(catButton).toHaveAttribute("aria-checked", "true", { timeout: 3_000 });

  const foxButton = page.getByTestId("avatar-fox_v2");
  await expect(foxButton).toHaveAttribute("aria-checked", "false");
});

// ---------------------------------------------------------------------------
// Chat send flow
// ---------------------------------------------------------------------------

test("clicking avatar opens chat panel and send flow works", async ({ page }) => {
  await gotoApp(page);

  const avatar = page.getByTestId("tokki-avatar");
  await avatar.click();

  const chatPanel = page.getByTestId("chat-panel");
  await expect(chatPanel).toBeVisible({ timeout: 5_000 });

  const viewport = page.viewportSize();
  const box = await chatPanel.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.y).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width - 8);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height - 8);
  await expect(page.getByTestId("popup-settings")).toBeVisible();
  await expect(page.getByTestId("popup-close")).toBeVisible();

  const inputField = page.getByTestId("chat-input-field");
  await expect(inputField).toBeVisible();
  await inputField.fill("hello");

  const sendButton = page.getByTestId("chat-input-send");
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  const assistantMsg = page.getByTestId("chat-bubble");
  await expect(assistantMsg).toBeVisible({ timeout: 8_000 });

  await expect(inputField).toHaveValue("");
});

test("privacy mode hides visible chat text and persists immediately", async ({ page }) => {
  await gotoApp(page);

  const avatar = page.getByTestId("tokki-avatar");
  await avatar.click();

  const chatPanel = page.getByTestId("chat-panel");
  await expect(chatPanel).toBeVisible({ timeout: 5_000 });

  const inputField = page.getByTestId("chat-input-field");
  await inputField.fill("secret hello");
  await page.getByTestId("chat-input-send").click();

  await expect(page.getByText("secret hello", { exact: true })).toBeVisible({ timeout: 5_000 });

  await avatar.click({ button: "right" });
  await expect(page.getByTestId("context-menu-privacy")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("context-menu-privacy").click();

  await expect(page.getByText(/privacy mode is on/i)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("secret hello", { exact: true })).toHaveCount(0);
  await expect(inputField).toHaveClass(/chat-input__field--privacy/);

  const privacyMode = await page.evaluate(
    () => window.localStorage.getItem("tokki_privacy_mode"),
  );
  expect(privacyMode).toBe("1");
});

// ---------------------------------------------------------------------------
// Poke (double-click) interaction
// ---------------------------------------------------------------------------

test("tokki reacts to poke interaction", async ({ page }) => {
  await gotoApp(page);

  // Fire two rapid clicks via evaluate so they both target the avatar
  // element directly, even if the first click opens the chat panel on top.
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="tokki-avatar"]');
    if (!el) return;
    el.click();
    el.click();
  });

  // The poke state is transient — the behavior loop overwrites it on the
  // next tick (~1200 ms). Poll rapidly to catch it.
  await expect
    .poll(async () => page.getByTestId("tokki-action").textContent(), {
      timeout: 5_000,
      intervals: [50, 100, 100, 200, 200, 500],
    })
    .toBe("react_poke");
});

// ---------------------------------------------------------------------------
// Behavior loop tick
// ---------------------------------------------------------------------------

test("tokki loads and changes action over time", async ({ page }) => {
  await gotoApp(page);

  const action = page.getByTestId("tokki-action");
  const initial = await action.textContent();

  // The fallback behavior loop ticks every ~1200 ms; wait for a change.
  await expect
    .poll(async () => action.textContent(), { timeout: 12_000 })
    .not.toBe(initial);
});
