const STREAK_KEY = "tokki_streak";

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isStreakData(value: unknown): value is StreakData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.count === "number" && typeof v.lastDate === "string";
}

function load(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isStreakData(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return { count: 0, lastDate: "" };
}

function save(data: StreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * Record an interaction for today. Returns the updated streak count.
 * If yesterday was the last interaction, streak increments.
 * If today was already recorded, no change.
 * Otherwise streak resets to 1.
 */
export function recordInteraction(): number {
  const data = load();
  const today = todayStr();

  if (data.lastDate === today) {
    return data.count;
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const newCount = data.lastDate === yStr ? data.count + 1 : 1;
  save({ count: newCount, lastDate: today });
  return newCount;
}

/** Get the current streak count without recording. */
export function getStreak(): number {
  const data = load();
  const today = todayStr();
  if (data.lastDate === today) return data.count;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  if (data.lastDate === yStr) return data.count; // not yet recorded today, but streak alive
  return 0; // streak broken
}

/** Milestones that trigger special messages. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;

export function isMilestone(count: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(count);
}
