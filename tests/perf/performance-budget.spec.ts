import { expect, test, type Page } from "@playwright/test";

const MB = 1024 * 1024;
const ONBOARDING_PROFILE_KEY = "tokki_onboarding_profile";

function readPositiveNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Math.floor(readPositiveNumberEnv(name, fallback));
  return parsed > 0 ? parsed : fallback;
}

function isAllowedRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }

    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return true;
  }
}

async function seedReturningProfile(page: Page): Promise<void> {
  await page.addInitScript(({ key }) => {
    const seededProfile = {
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

    window.localStorage.setItem(key, JSON.stringify(seededProfile));
    window.localStorage.setItem("tokki_onboarded", "1");
    window.localStorage.setItem("tokki_avatar_id", seededProfile.avatarId);
    window.localStorage.setItem("tokki_pet_name", seededProfile.personality.name);
  }, { key: ONBOARDING_PROFILE_KEY });
}

interface PerfSnapshot {
  jsHeapUsedBytes: number;
  scriptDurationSeconds: number;
  taskDurationSeconds: number;
  timestampMs: number;
}

test("startup and idle footprint stays inside performance budgets", async ({ page }) => {
  const startupHeapBudgetMb = readPositiveNumberEnv("TOKKI_PERF_STARTUP_HEAP_MB", 50);
  const idleHeapGrowthBudgetMb = readPositiveNumberEnv("TOKKI_PERF_IDLE_HEAP_GROWTH_MB", 5);
  const idleScriptCpuBudgetPct = readPositiveNumberEnv("TOKKI_PERF_IDLE_CPU_PCT", 1);
  const idleTaskCpuBudgetPct = readPositiveNumberEnv("TOKKI_PERF_IDLE_TASK_CPU_PCT", 20);
  const warmupMs = readPositiveIntEnv("TOKKI_PERF_WARMUP_MS", 3_000);
  const idleWindowMs = readPositiveIntEnv("TOKKI_PERF_IDLE_WINDOW_MS", 4_000);
  const idleIntervals = readPositiveIntEnv("TOKKI_PERF_IDLE_INTERVALS", 3);

  // Keep perf budgets deterministic by blocking non-localhost traffic.
  await page.route("**/*", async (route) => {
    if (isAllowedRequest(route.request().url())) {
      await route.continue();
      return;
    }

    await route.abort();
  });

  await seedReturningProfile(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("tokki-avatar")).toBeVisible({ timeout: 10_000 });

  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("Performance.enable");

  const captureSnapshot = async (): Promise<PerfSnapshot> => {
    const response = await cdpSession.send("Performance.getMetrics");
    const metrics = response.metrics as Array<{ name: string; value: number }>;
    const metricMap = Object.fromEntries(
      metrics.map((metric) => [metric.name, metric.value]),
    ) as Record<string, number>;

    const jsHeapUsedBytes = metricMap.JSHeapUsedSize;
    if (!Number.isFinite(jsHeapUsedBytes) || jsHeapUsedBytes <= 0) {
      throw new Error("Missing JSHeapUsedSize metric from Chromium CDP performance data.");
    }

    const scriptDurationSeconds = metricMap.ScriptDuration ?? 0;
    const taskDurationSeconds = metricMap.TaskDuration ?? 0;
    return {
      jsHeapUsedBytes,
      scriptDurationSeconds,
      taskDurationSeconds,
      timestampMs: Date.now(),
    };
  };

  await page.waitForTimeout(warmupMs);

  const startupSnapshot = await captureSnapshot();
  let previousSnapshot = startupSnapshot;
  const idleScriptCpuSamplesPct: number[] = [];
  const idleTaskCpuSamplesPct: number[] = [];

  for (let intervalIndex = 0; intervalIndex < idleIntervals; intervalIndex += 1) {
    await page.waitForTimeout(idleWindowMs);
    const currentSnapshot = await captureSnapshot();

    const elapsedSeconds = Math.max(
      (currentSnapshot.timestampMs - previousSnapshot.timestampMs) / 1_000,
      0.001,
    );
    const taskDurationDelta = Math.max(
      currentSnapshot.taskDurationSeconds - previousSnapshot.taskDurationSeconds,
      0,
    );
    const scriptDurationDelta = Math.max(
      currentSnapshot.scriptDurationSeconds - previousSnapshot.scriptDurationSeconds,
      0,
    );

    idleTaskCpuSamplesPct.push((taskDurationDelta / elapsedSeconds) * 100);
    idleScriptCpuSamplesPct.push((scriptDurationDelta / elapsedSeconds) * 100);
    previousSnapshot = currentSnapshot;
  }

  await cdpSession.send("Performance.disable");

  const startupHeapMb = startupSnapshot.jsHeapUsedBytes / MB;
  const endHeapMb = previousSnapshot.jsHeapUsedBytes / MB;
  const idleHeapGrowthMb = endHeapMb - startupHeapMb;
  const meanIdleScriptCpuPct =
    idleScriptCpuSamplesPct.reduce((sum, sample) => sum + sample, 0) /
    idleScriptCpuSamplesPct.length;
  const meanIdleTaskCpuPct =
    idleTaskCpuSamplesPct.reduce((sum, sample) => sum + sample, 0) /
    idleTaskCpuSamplesPct.length;
  const peakIdleTaskCpuPct = Math.max(...idleTaskCpuSamplesPct);

  console.info(
    `[perf-budget] startupHeapMb=${startupHeapMb.toFixed(2)} idleHeapGrowthMb=${idleHeapGrowthMb.toFixed(2)} meanIdleScriptCpuPct=${meanIdleScriptCpuPct.toFixed(2)} meanIdleTaskCpuPct=${meanIdleTaskCpuPct.toFixed(2)} peakIdleTaskCpuPct=${peakIdleTaskCpuPct.toFixed(2)} ` +
      `budgets(startup<=${startupHeapBudgetMb}, idleHeapGrowth<=${idleHeapGrowthBudgetMb}, idleScriptCpu<=${idleScriptCpuBudgetPct}, idleTaskCpu<=${idleTaskCpuBudgetPct})`,
  );

  expect(startupHeapMb).toBeLessThanOrEqual(startupHeapBudgetMb);
  expect(idleHeapGrowthMb).toBeLessThanOrEqual(idleHeapGrowthBudgetMb);
  expect(meanIdleScriptCpuPct).toBeLessThanOrEqual(idleScriptCpuBudgetPct);
  expect(meanIdleTaskCpuPct).toBeLessThanOrEqual(idleTaskCpuBudgetPct);
});
