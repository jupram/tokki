import { FRONTEND_AVATAR_IDS, type AvatarId, type PersonalityConfig, type PersonalityPreset } from "../types/tokki";

export interface OnboardingProfile {
  version: 1;
  avatarId: AvatarId;
  personality: PersonalityConfig;
  userName: string | null;
  completedAt: string;
}

export const ONBOARDING_PROFILE_KEY = "tokki_onboarding_profile";
const LEGACY_ONBOARDED_KEY = "tokki_onboarded";
const LEGACY_AVATAR_KEY = "tokki_avatar_id";
const LEGACY_PET_NAME_KEY = "tokki_pet_name";
const LEGACY_USER_NAME_KEY = "tokki_user_name";
const PROFILE_VERSION = 1;
const DEFAULT_AVATAR_ID: AvatarId = "rabbit_v2";
const ACTIVE_FRONTEND_AVATAR_SET = new Set<AvatarId>(FRONTEND_AVATAR_IDS);
const LEGACY_AVATAR_MIGRATIONS = {
  rabbit_v1: "rabbit_v2",
  cat_v2: "cat_v1",
  fox_v1: "fox_v2",
  phoenix_v1: DEFAULT_AVATAR_ID,
  serpent_v1: DEFAULT_AVATAR_ID,
  turtle_v1: DEFAULT_AVATAR_ID,
} as const;

type LegacyAvatarId = keyof typeof LEGACY_AVATAR_MIGRATIONS;

const PRESET_META = {
  gentle: { label: "Gentle", blurb: "soft-hearted, warm, and easy to trust" },
  aloof: { label: "Aloof", blurb: "cool, observant, and quietly affectionate" },
  clever: { label: "Clever", blurb: "quick-witted, curious, and a little mischievous" },
  proud: { label: "Proud", blurb: "bold, regal, and impossible to ignore" },
  radiant: { label: "Radiant", blurb: "bright, uplifting, and full of spark" },
  mystical: { label: "Mystical", blurb: "dreamy, fox-fire strange, and full of secrets" },
  stoic: { label: "Stoic", blurb: "steady, composed, and calm under pressure" },
  cheerful: { label: "Cheerful", blurb: "sunny, eager, and ready to play" },
  wise: { label: "Wise", blurb: "thoughtful, grounded, and quietly magical" },
  serene: { label: "Serene", blurb: "peaceful, patient, and slow in the best way" },
} as const satisfies Record<PersonalityPreset, { label: string; blurb: string }>;

const DEFAULT_PERSONALITIES: Record<AvatarId, PersonalityConfig> = {
  rabbit_v2: {
    name: "Bun",
    preset: "gentle",
    humor: 40,
    reaction_intensity: 60,
    chattiness: 45,
  },
  cat_v1: {
    name: "Mochi",
    preset: "aloof",
    humor: 55,
    reaction_intensity: 40,
    chattiness: 25,
  },
  dog_v1: {
    name: "Scout",
    preset: "cheerful",
    humor: 60,
    reaction_intensity: 80,
    chattiness: 70,
  },
  fox_v2: {
    name: "Ember",
    preset: "clever",
    humor: 70,
    reaction_intensity: 65,
    chattiness: 55,
  },
  dragon_v1: {
    name: "Ignis",
    preset: "proud",
    humor: 45,
    reaction_intensity: 90,
    chattiness: 35,
  },
  kitsune_v1: {
    name: "Yuki",
    preset: "mystical",
    humor: 65,
    reaction_intensity: 55,
    chattiness: 40,
  },
  penguin_v1: {
    name: "Pip",
    preset: "cheerful",
    humor: 75,
    reaction_intensity: 70,
    chattiness: 60,
  },
  owl_v1: {
    name: "Athena",
    preset: "wise",
    humor: 50,
    reaction_intensity: 50,
    chattiness: 30,
  },
};

const NAME_SUGGESTIONS: Record<AvatarId, readonly string[]> = {
  rabbit_v2: ["Bun", "Thumper", "Clover"],
  cat_v1: ["Mochi", "Whiskers", "Luna"],
  dog_v1: ["Scout", "Maple", "Pippin"],
  fox_v2: ["Ember", "Scout", "Rusty"],
  dragon_v1: ["Ignis", "Cinder", "Ryu"],
  kitsune_v1: ["Yuki", "Hikari", "Kiko"],
  penguin_v1: ["Pip", "Pebble", "Skipper"],
  owl_v1: ["Athena", "Comet", "Nyx"],
};

const AVATAR_IDS = Object.keys(DEFAULT_PERSONALITIES) as AvatarId[];
const LEGACY_AVATAR_IDS = Object.keys(LEGACY_AVATAR_MIGRATIONS) as LegacyAvatarId[];
const PRESETS = Object.keys(PRESET_META) as PersonalityPreset[];

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && AVATAR_IDS.includes(value as AvatarId);
}

function isActiveFrontendAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && ACTIVE_FRONTEND_AVATAR_SET.has(value as AvatarId);
}

function isLegacyAvatarId(value: unknown): value is LegacyAvatarId {
  return typeof value === "string" && LEGACY_AVATAR_IDS.includes(value as LegacyAvatarId);
}

export function normalizeAvatarId(value: unknown): AvatarId | null {
  if (isLegacyAvatarId(value)) {
    return LEGACY_AVATAR_MIGRATIONS[value];
  }

  if (isActiveFrontendAvatarId(value)) {
    return value;
  }

  return null;
}

function isPreset(value: unknown): value is PersonalityPreset {
  return typeof value === "string" && PRESETS.includes(value as PersonalityPreset);
}

function clampDial(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 24) : fallback;
}

function normalizeOptionalName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 24) : null;
}

function syncLegacyKeys(profile: OnboardingProfile): void {
  localStorage.setItem(LEGACY_ONBOARDED_KEY, "1");
  localStorage.setItem(LEGACY_AVATAR_KEY, profile.avatarId);
  localStorage.setItem(LEGACY_PET_NAME_KEY, profile.personality.name);
  if (profile.userName) {
    localStorage.setItem(LEGACY_USER_NAME_KEY, profile.userName);
  } else {
    localStorage.removeItem(LEGACY_USER_NAME_KEY);
  }
}

function normalizePersonality(value: unknown, avatarId: AvatarId): PersonalityConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const fallback = getDefaultPersonalityForAvatar(avatarId);
  return {
    name: normalizeName(value.name, fallback.name),
    preset: isPreset(value.preset) ? value.preset : fallback.preset,
    humor: clampDial(value.humor, fallback.humor),
    reaction_intensity: clampDial(value.reaction_intensity, fallback.reaction_intensity),
    chattiness: clampDial(value.chattiness, fallback.chattiness),
  };
}

function parseStoredProfile(value: unknown): OnboardingProfile | null {
  if (!isRecord(value) || value.version !== PROFILE_VERSION) {
    return null;
  }

  const avatarId = normalizeAvatarId(value.avatarId);
  if (!avatarId) {
    return null;
  }

  if (typeof value.completedAt !== "string" || !value.completedAt) {
    return null;
  }

  const personality = normalizePersonality(value.personality, avatarId);
  if (!personality) {
    return null;
  }

  return {
    version: PROFILE_VERSION,
    avatarId,
    personality,
    userName: normalizeOptionalName(value.userName ?? value.user_name),
    completedAt: value.completedAt,
  };
}

function migrateLegacyProfile(): OnboardingProfile | null {
  if (!hasStorage() || localStorage.getItem(LEGACY_ONBOARDED_KEY) !== "1") {
    return null;
  }

  const avatarId = normalizeAvatarId(localStorage.getItem(LEGACY_AVATAR_KEY)) ?? DEFAULT_AVATAR_ID;
  const fallback = getDefaultPersonalityForAvatar(avatarId);
  const name = normalizeName(localStorage.getItem(LEGACY_PET_NAME_KEY), fallback.name);
  return createOnboardingProfile({
    avatarId,
    name,
    userName: localStorage.getItem(LEGACY_USER_NAME_KEY),
  });
}

export function getDefaultPersonalityForAvatar(avatarId: AvatarId): PersonalityConfig {
  const fallback = DEFAULT_PERSONALITIES[avatarId] ?? DEFAULT_PERSONALITIES[DEFAULT_AVATAR_ID];
  return { ...fallback };
}

export function getAvatarNameSuggestions(avatarId: AvatarId): readonly string[] {
  return NAME_SUGGESTIONS[avatarId] ?? [getDefaultPersonalityForAvatar(avatarId).name];
}

export function getPersonalityPresetMeta(
  preset: PersonalityPreset
): { label: string; blurb: string } {
  return PRESET_META[preset];
}

export function createOnboardingProfile(options: {
  avatarId: AvatarId;
  name?: string;
  userName?: string | null;
  personality?: Partial<PersonalityConfig>;
}): OnboardingProfile {
  const fallback = getDefaultPersonalityForAvatar(options.avatarId);
  const personality = {
    ...fallback,
    ...options.personality,
    name: normalizeName(options.name ?? options.personality?.name, fallback.name),
    preset: isPreset(options.personality?.preset) ? options.personality.preset : fallback.preset,
    humor: clampDial(options.personality?.humor, fallback.humor),
    reaction_intensity: clampDial(
      options.personality?.reaction_intensity,
      fallback.reaction_intensity
    ),
    chattiness: clampDial(options.personality?.chattiness, fallback.chattiness),
  };

  return {
    version: PROFILE_VERSION,
    avatarId: options.avatarId,
    personality,
    userName: normalizeOptionalName(options.userName),
    completedAt: new Date().toISOString(),
  };
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  if (!hasStorage()) {
    return;
  }

  const normalized = createOnboardingProfile({
    avatarId: profile.avatarId,
    name: profile.personality.name,
    userName: profile.userName,
    personality: profile.personality,
  });
  const persistedProfile = {
    ...normalized,
    completedAt: typeof profile.completedAt === "string" && profile.completedAt
      ? profile.completedAt
      : normalized.completedAt,
  };

  try {
    localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(persistedProfile));
    syncLegacyKeys(persistedProfile);
  } catch {
    // Ignore storage errors so onboarding can still continue in runtime state.
  }
}

export function loadOnboardingProfile(): OnboardingProfile | null {
  if (!hasStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (raw) {
      const parsed = parseStoredProfile(JSON.parse(raw));
      if (parsed) {
        syncLegacyKeys(parsed);
        return parsed;
      }
    }
  } catch {
    // Fall through to legacy migration.
  }

  const migrated = migrateLegacyProfile();
  if (migrated) {
    saveOnboardingProfile(migrated);
    return migrated;
  }

  return null;
}

export function isOnboardingComplete(
  profile: OnboardingProfile | null
): profile is OnboardingProfile {
  return Boolean(
    profile &&
    profile.completedAt &&
    isAvatarId(profile.avatarId) &&
    profile.personality.name.trim()
  );
}
