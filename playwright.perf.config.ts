import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/perf",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
