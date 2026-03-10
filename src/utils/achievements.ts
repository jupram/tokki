/**
 * Achievement system — persistent badges unlocked by user milestones.
 * Stored in localStorage. Checked lazily; new unlocks trigger a callback.
 */

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalChats: number;
  totalPets: number;
  totalClicks: number;
  streakDays: number;
  minutesOpen: number;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_chat", name: "First Words", icon: "\uD83D\uDCAC", description: "Send your first chat message", check: (s) => s.totalChats >= 1 },
  { id: "chatterbox", name: "Chatterbox", icon: "\uD83D\uDDE3\uFE0F", description: "Send 25 chat messages", check: (s) => s.totalChats >= 25 },
  { id: "first_pet", name: "Gentle Touch", icon: "\uD83D\uDC96", description: "Pet Tokki for the first time", check: (s) => s.totalPets >= 1 },
  { id: "pet_master", name: "Pet Master", icon: "\uD83E\uDD81", description: "Pet Tokki 50 times", check: (s) => s.totalPets >= 50 },
  { id: "clicker", name: "Clickety Click", icon: "\uD83D\uDC46", description: "Click Tokki 100 times", check: (s) => s.totalClicks >= 100 },
  { id: "streak_3", name: "Three's a Charm", icon: "\u2728", description: "Reach a 3-day streak", check: (s) => s.streakDays >= 3 },
  { id: "streak_7", name: "Weekly Warrior", icon: "\uD83D\uDD25", description: "Reach a 7-day streak", check: (s) => s.streakDays >= 7 },
  { id: "streak_30", name: "Monthly Legend", icon: "\uD83C\uDF1F", description: "Reach a 30-day streak", check: (s) => s.streakDays >= 30 },
  { id: "night_owl", name: "Night Owl", icon: "\uD83E\uDD89", description: "Use Tokki between midnight and 4am", check: () => { const h = new Date().getHours(); return h >= 0 && h < 4; } },
  { id: "early_bird", name: "Early Bird", icon: "\uD83D\uDC26", description: "Use Tokki between 5am and 7am", check: () => { const h = new Date().getHours(); return h >= 5 && h < 7; } },
  { id: "patient", name: "Patient Friend", icon: "\u23F3", description: "Keep Tokki open for 30 minutes", check: (s) => s.minutesOpen >= 30 },
  { id: "devoted", name: "Devoted Companion", icon: "\uD83D\uDC8E", description: "Keep Tokki open for 2 hours", check: (s) => s.minutesOpen >= 120 },
];

const STORAGE_KEY_STATS = "tokki_achievement_stats";
const STORAGE_KEY_UNLOCKED = "tokki_achievements";

const DEFAULT_STATS: AchievementStats = { totalChats: 0, totalPets: 0, totalClicks: 0, streakDays: 0, minutesOpen: 0 };

function isAchievementStats(value: unknown): value is AchievementStats {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.totalChats === "number" &&
    typeof v.totalPets === "number" &&
    typeof v.totalClicks === "number" &&
    typeof v.streakDays === "number" &&
    typeof v.minutesOpen === "number"
  );
}

export function loadStats(): AchievementStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAchievementStats(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

export function saveStats(stats: AchievementStats): void {
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
}

export function incrementStat(key: keyof AchievementStats, amount = 1): AchievementStats {
  const stats = loadStats();
  stats[key] += amount;
  saveStats(stats);
  return stats;
}

function isUnlockedBadge(value: unknown): value is UnlockedBadge {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.unlockedAt === "number";
}

export function loadUnlocked(): UnlockedBadge[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isUnlockedBadge)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveUnlocked(badges: UnlockedBadge[]): void {
  localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(badges));
}

/** Check all achievements and return any newly unlocked ones. */
export function checkAchievements(stats: AchievementStats): UnlockedBadge[] {
  const existing = new Set(loadUnlocked().map((b) => b.id));
  const newlyUnlocked: UnlockedBadge[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (existing.has(ach.id)) continue;
    if (ach.check(stats)) {
      newlyUnlocked.push({ id: ach.id, unlockedAt: Date.now() });
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked([...loadUnlocked(), ...newlyUnlocked]);
  }

  return newlyUnlocked;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}
